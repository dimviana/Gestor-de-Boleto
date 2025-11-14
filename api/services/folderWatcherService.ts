import { promises as fs } from 'fs';
import path from 'path';
import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { extractBoletoInfoWithPython } from './pythonService';
import { Company, Boleto, BoletoStatus } from '../../types';

const WATCH_INTERVAL = 30000; // 30 seconds
const currentlyProcessing = new Set<string>();

async function processFile(filePath: string, company: Company): Promise<void> {
    const fileName = path.basename(filePath);
    const processedDir = path.join(path.dirname(filePath), '_processed');
    const failedDir = path.join(path.dirname(filePath), '_failed');
    
    // Ensure subdirectories exist
    await fs.mkdir(processedDir, { recursive: true });
    await fs.mkdir(failedDir, { recursive: true });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Find an admin or editor to associate the boleto with
        const [users] = await connection.query<RowDataPacket[]>('SELECT id, username FROM users WHERE company_id = ? AND role IN (?, ?) LIMIT 1', [company.id, 'admin', 'editor']);
        if (users.length === 0) {
            throw new Error(`No admin/editor user found for company ${company.name} to assign the boleto to.`);
        }
        const designatedUser = users[0];

        const fileBuffer = await fs.readFile(filePath);
        const extractedData = await extractBoletoInfoWithPython(fileBuffer, fileName);
        
        // Validations
        if (extractedData.amount === null || extractedData.amount === undefined) throw new Error('amountNotFoundErrorText');
        if (extractedData.amount === 0) throw new Error('freeBoletoErrorText');
        if (!extractedData.barcode) throw new Error('invalidBarcodeErrorText');

        const [existing] = await connection.query<RowDataPacket[]>('SELECT id FROM boletos WHERE barcode = ? AND company_id = ?', [extractedData.barcode, company.id]);
        if (existing.length > 0) throw new Error(`Duplicate barcode: ${extractedData.guideNumber || extractedData.barcode}`);

        const newBoleto: Omit<Boleto, 'id' | 'createdAt' | 'updatedAt'> = {
            ...extractedData,
            status: BoletoStatus.TO_PAY,
            fileData: fileBuffer.toString('base64'),
            comments: 'Boleto importado automaticamente pelo monitor de pastas.',
            companyId: company.id,
        };

        const newId = uuidv4();
        await connection.query('INSERT INTO boletos (id, user_id, company_id, recipient, drawee, document_date, due_date, document_amount, amount, discount, interest_and_fines, barcode, guide_number, pix_qr_code_text, status, file_name, file_data, comments, extracted_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            newId, designatedUser.id, newBoleto.companyId, newBoleto.recipient, newBoleto.drawee, newBoleto.documentDate, newBoleto.dueDate, newBoleto.documentAmount, newBoleto.amount, newBoleto.discount, newBoleto.interestAndFines, newBoleto.barcode, newBoleto.guideNumber, newBoleto.pixQrCodeText, newBoleto.status, newBoleto.fileName, newBoleto.fileData, newBoleto.comments, JSON.stringify(extractedData)
        ]);

        await connection.query('INSERT INTO activity_logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)', [
            uuidv4(), designatedUser.id, designatedUser.username, 'CREATE_BOLEto', `Created boleto '${newBoleto.guideNumber || 'N/A'}' via folder watcher.`
        ]);
        
        await connection.commit();
        await fs.rename(filePath, path.join(processedDir, fileName));
        console.log(`[Folder Watcher] Successfully processed and moved: ${fileName}`);

    } catch (error: any) {
        await connection.rollback();
        console.error(`[Folder Watcher] Failed to process ${fileName}:`, error.message);
        await fs.rename(filePath, path.join(failedDir, fileName));
    } finally {
        connection.release();
    }
}

async function processDirectory(company: Company): Promise<void> {
    const dirPath = company.monitoredFolderPath;
    if (!dirPath) return;

    if (currentlyProcessing.has(company.id)) {
        console.log(`[Folder Watcher] Skipping scan for ${company.name}, already in progress.`);
        return;
    }
    
    currentlyProcessing.add(company.id);
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        const pdfFilesToProcess = entries
            .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
            .slice(0, 10); // Limit to a maximum of 10 files

        for (const entry of pdfFilesToProcess) {
            const filePath = path.join(dirPath, entry.name);
            await processFile(filePath, company);
        }
    } catch (error: any) {
        console.error(`[Folder Watcher] Error scanning directory ${dirPath} for company ${company.name}:`, error.message);
        // Could disable monitoring for this company after several failed attempts
    } finally {
        currentlyProcessing.delete(company.id);
    }
}

async function scanAndProcessFolders(): Promise<void> {
    try {
        const [companies] = await pool.query<RowDataPacket[]>("SELECT * FROM companies WHERE monitored_folder_path IS NOT NULL AND monitored_folder_path != ''");
        if (companies.length > 0) {
            console.log(`[Folder Watcher] Found ${companies.length} companies to scan. Starting scan...`);
            await Promise.all(companies.map(c => processDirectory(c as Company)));
        }
    } catch (error) {
        console.error('[Folder Watcher] Critical error fetching companies from DB:', error);
    }
}

export function startWatching(): void {
    console.log(`[Folder Watcher] Service started. Scanning every ${WATCH_INTERVAL / 1000} seconds.`);
    setInterval(scanAndProcessFolders, WATCH_INTERVAL);
    // Initial scan on startup
    scanAndProcessFolders();
}