import React, { useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useWhitelabel } from '../contexts/WhitelabelContext';
import { DocumentTextIcon } from './icons/Icons';

// Let TypeScript know about the global variables from the CDN scripts
declare const jspdf: any;
declare const html2canvas: any;

const Documentation: React.FC = () => {
    const { t } = useLanguage();
    const { appName } = useWhitelabel();
    const docContentRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async () => {
        const content = docContentRef.current;
        if (!content) return;

        try {
            const canvas = await html2canvas(content, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
            });
            
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = jspdf;
            
            // A4 dimensions in points: 595.28 x 841.89
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4',
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;

            const imgWidth = pdfWidth - 40; // With some margin
            const imgHeight = imgWidth / ratio;
            
            let heightLeft = imgHeight;
            let position = 20; // Top margin

            pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 40);

            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 20; // reset top position
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - 40);
            }
            
            pdf.save('Boleto-Manager-Documentation.pdf');

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Could not generate PDF. See console for details.");
        }
    };

    const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
        <section className="mb-8">
            <h3 className="text-2xl font-bold text-blue-700 border-b-2 border-blue-200 pb-2 mb-4">{title}</h3>
            <div className="prose max-w-none text-gray-700">{children}</div>
        </section>
    );

    const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto text-sm">
            <code>{children}</code>
        </pre>
    );

    return (
        <div>
            <div ref={docContentRef} className="p-4 bg-white">
                <header className="mb-8 text-center">
                    <h2 className="text-4xl font-extrabold text-blue-600">{appName}</h2>
                    <p className="text-lg text-gray-500">{t('loginSubtitle')}</p>
                </header>
                
                <Section title="1. Project Overview">
                    <p>Boleto Manager is a modern SaaS platform designed to streamline the management of Brazilian "boleto" payment slips. Users can upload a PDF file of a boleto, and the system leverages a powerful backend script to automatically extract key information such as the recipient, due date, amount, and barcode. The extracted boletos are then displayed on an intuitive Kanban board, allowing users to track their payment status from "To Pay" to "Verifying" and finally to "Paid."</p>
                </Section>

                <Section title="2. Architecture & Technologies">
                    <p>The application consists of a modern frontend single-page application (SPA) and a robust backend server.</p>
                    <ul>
                        <li><strong>React:</strong> The core UI library for building components.</li>
                        <li><strong>TypeScript:</strong> For static typing, improving code quality and maintainability.</li>
                        <li><strong>Tailwind CSS:</strong> A utility-first CSS framework for rapid and consistent styling.</li>
                        <li><strong>Node.js/Express:</strong> A backend server to handle API requests, user authentication, and database interactions.</li>
                        <li><strong>Python (PyMuPDF):</strong> A powerful Python script is used on the backend to perform fast and accurate text extraction from PDF files.</li>
                        <li><strong>MySQL:</strong> A relational database for persisting all application data, including users, companies, and boletos.</li>
                    </ul>
                </Section>

                <Section title="3. File Structure">
                    <Code>{`
/
├── api/                # Backend (Node.js/Express) source code
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   │   ├── parser.py   # The Python script for PDF text extraction
│   │   └── ...
│   └── index.ts        # Backend entry point
├── components/         # Frontend React components
│   ├── icons/
│   └── ...
├── contexts/           # Frontend React Context providers
├── hooks/              # Frontend custom React hooks
├── services/           # Frontend service modules
│   └── api.ts          # Frontend API client
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
├── index.tsx           # Frontend entry point
└── index.html          # Main HTML file
                    `}</Code>
                </Section>

                <Section title="4. Installation and Setup Guide">
                    <p>The project is designed for server deployment using the provided `deploy.txt` script. This script automates the setup of the server environment, including Nginx, Node.js, Python, and SSL certificates.</p>
                    <h4 className="font-bold mt-4">Prerequisites:</h4>
                    <ul>
                        <li>A Linux server (Ubuntu recommended).</li>
                        <li>A domain name pointed to your server's IP address.</li>
                        <li>A pre-installed MySQL database.</li>
                    </ul>
                     <h4 className="font-bold mt-4">Running the App:</h4>
                    <p>Follow the instructions in `INSTRUCOES.md` to use the `deploy.txt` script for a complete, automated production setup. The script will handle creating the necessary `.env` file on the server with your database credentials and other secrets.</p>
                    <p>The backend server handles all the heavy lifting, including the PDF parsing via its Python script, so there's no complex local setup required for the frontend to function once deployed.</p>
                </Section>

                <Section title="5. How to Use">
                    <ol>
                        <li><strong>Login:</strong> On the login screen, enter your credentials. An administrator can create users with different roles (Admin, Editor, Viewer).</li>
                        <li><strong>(Admin) Customize Appearance:</strong> If logged in as admin, click the settings icon in the header to open the Admin Panel. Here you can change the application name and logo URL.</li>
                        <li><strong>Upload Boleto:</strong> Drag and drop a PDF file onto the designated area, or click to select a file from your computer.</li>
                        <li><strong>Backend Processing:</strong> The system will upload the file to the server, which then uses its Python script to analyze the PDF and extract the data.</li>
                        <li><strong>Manage on Kanban Board:</strong> Once processed, the new boleto card will appear in the "To Pay" column.</li>
                        <li><strong>Update Status:</strong> Click the action buttons on a card to move it through the workflow: "Mark as Paid" moves it to "Verifying," and "Verify Payment" moves it to "Paid."</li>
                        <li><strong>View/Delete:</strong> You can view the original PDF or delete a boleto using the icons on each card.</li>
                    </ol>
                </Section>

                 <Section title="6. Database and Persistence">
                    <p>The application uses a MySQL database for all data persistence. This includes:</p>
                    <ul>
                       <li>`users`: Stores user credentials, roles, and company associations.</li>
                       <li>`companies`: Allows for multi-tenancy, grouping users and boletos by company.</li>
                       <li>`boletos`: Stores all extracted boleto data and a Base64-encoded copy of the original PDF file.</li>
                       <li>`activity_logs`: Records important actions taken by users for auditing purposes.</li>
                       <li>`settings`: Persists administrative settings like the application name and JWT secret.</li>
                    </ul>
                </Section>
            </div>
            
            <footer className="mt-6 p-4 border-t flex justify-end">
                 <button
                    onClick={handleDownloadPdf}
                    className="flex items-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300"
                >
                    <DocumentTextIcon className="w-5 h-5 mr-2" />
                    {t('downloadPdf')}
                </button>
            </footer>
        </div>
    );
};

export default Documentation;