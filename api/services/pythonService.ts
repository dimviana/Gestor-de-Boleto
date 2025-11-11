
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { Boleto } from '../../types';
// Add import for Buffer to resolve type error.
import { Buffer } from 'buffer';

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
// The script is located in the source directory, and will be renamed to .py by the deploy script
// Use path.resolve to avoid type errors with process.cwd() in mixed environments where browser types might conflict with Node.js types.
const PARSER_SCRIPT_PATH = path.resolve('api', 'services', 'parser.py');

export const extractBoletoInfoWithPython = (pdfBuffer: Buffer, fileName: string): Promise<Omit<Boleto, 'id' | 'status' | 'fileData' | 'comments' | 'companyId'>> => {
    return new Promise(async (resolve, reject) => {
        const tempId = uuidv4();
        const tempPdfPath = path.join(os.tmpdir(), `${tempId}.pdf`);

        const cleanup = () => {
            fs.unlink(tempPdfPath).catch(err => console.error(`Failed to delete temp file ${tempPdfPath}`, err));
        };
        
        try {
            await fs.writeFile(tempPdfPath, pdfBuffer);

            execFile(PYTHON_PATH, [PARSER_SCRIPT_PATH, tempPdfPath], { encoding: 'utf8', timeout: 15000 }, (error, stdout, stderr) => {
                cleanup();

                if (error) {
                    console.error('Python script execution error:', stderr || error.message);
                    return reject(new Error(`Python script failed: ${stderr || error.message}`));
                }

                try {
                    const result = JSON.parse(stdout);
                    if (result.error) {
                        return reject(new Error(result.error));
                    }
                    
                    const boletoData = { ...result, fileName, extractedData: result };
                    resolve(boletoData);
                } catch (parseError) {
                    console.error('Error parsing python script output:', stdout);
                    reject(new Error('Failed to parse result from Python script.'));
                }
            });

        } catch (writeError) {
            cleanup();
            console.error('Error writing temp PDF file:', writeError);
            reject(new Error('Failed to write temporary PDF file.'));
        }
    });
};
