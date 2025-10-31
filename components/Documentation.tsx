
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
            
            pdf.save('Boleto-Manager-AI-Documentation.pdf');

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
                    <p>Boleto Manager AI is a modern SaaS platform designed to streamline the management of Brazilian "boleto" payment slips. Users can upload a PDF file of a boleto, and the system leverages Google's Gemini AI to automatically extract key information such as the recipient, due date, amount, and barcode. The extracted boletos are then displayed on an intuitive Kanban board, allowing users to track their payment status from "To Pay" to "Verifying" and finally to "Paid."</p>
                </Section>

                <Section title="2. Architecture & Technologies">
                    <p>The application is a purely client-side single-page application (SPA) built with a modern frontend stack.</p>
                    <ul>
                        <li><strong>React:</strong> The core UI library for building components.</li>
                        <li><strong>TypeScript:</strong> For static typing, improving code quality and maintainability.</li>
                        <li><strong>Tailwind CSS:</strong> A utility-first CSS framework for rapid and consistent styling.</li>
                        <li><strong>Google Gemini API (@google/genai):</strong> Used for the powerful AI-driven data extraction from PDF images.</li>
                        <li><strong>PDF.js:</strong> A library by Mozilla to render PDF files in the browser and convert the first page into an image for AI analysis.</li>
                        <li><strong>Simulated API (LocalStorage):</strong> For persistence, the application currently uses a simulated API service that stores all boleto data in the browser's <code>localStorage</code>. This makes the app self-contained and deployable on any static hosting, but it's designed to be easily swappable with a real backend.</li>
                    </ul>
                </Section>

                <Section title="3. File Structure">
                    <Code>{`
/
├── components/       # Reusable React components
│   ├── icons/        # SVG icon components
│   ├── BoletoCard.tsx
│   ├── Dashboard.tsx
│   ├── Documentation.tsx # This documentation component
│   └── ...
├── contexts/         # React Context providers (e.g., LanguageContext)
├── hooks/            # Custom React hooks (e.g., useBoletos)
├── services/         # Modules for external interactions
│   ├── api.ts        # Simulated API for data persistence (LocalStorage)
│   └── geminiService.ts # Logic for interacting with Gemini AI
├── types.ts          # TypeScript type definitions
├── translations.ts   # Internationalization (i1n) strings
├── App.tsx           # Main application component with routing
├── index.tsx         # Application entry point
└── index.html        # Main HTML file
                    `}</Code>
                </section>

                <Section title="4. Installation and Setup Guide">
                    <p>Follow these steps to run the project on your local machine.</p>
                    <h4 className="font-bold mt-4">Prerequisites:</h4>
                    <ul>
                        <li>A modern web browser (Chrome, Firefox, Edge).</li>
                        <li>Internet connection.</li>
                        <li>A Google Gemini API Key. You can get one from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.</li>
                    </ul>
                     <h4 className="font-bold mt-4">Running the App:</h4>
                    <p>This application is designed to run directly in a browser from the provided files without a build step.</p>
                    <ol>
                        <li><strong>Open <code>index.html</code>:</strong> Simply open the <code>index.html</code> file in your web browser.</li>
                        <li><strong>Set API Key:</strong> The application requires a Google Gemini API key to function. Since there's no backend, you must set it directly in the browser.
                            <ul>
                                <li>Open your browser's Developer Tools (usually by pressing F12).</li>
                                <li>Go to the <strong>Console</strong> tab.</li>
                                <li>Execute the following command, replacing <code>"YOUR_API_KEY_HERE"</code> with your actual key:</li>
                            </ul>
                        </li>
                    </ol>
                    <Code>
                        {`localStorage.setItem('gemini_api_key', 'YOUR_API_KEY_HERE');`}
                    </Code>
                    <p><strong>Note:</strong> The app has been updated to use an environment variable `process.env.API_KEY`. In this live environment, the key is assumed to be injected automatically.</p>
                </Section>

                <Section title="5. How to Use">
                    <ol>
                        <li><strong>Login:</strong> On the login screen, type a username. Use 'admin' to access administrative features. Click "Access Dashboard" to enter.</li>
                        <li><strong>(Admin) Customize Appearance:</strong> If logged in as admin, click the settings icon in the header to open the Admin Panel. Here you can change the application name and logo URL.</li>
                        <li><strong>Upload Boleto:</strong> Drag and drop a PDF file onto the designated area, or click to select a file from your computer.</li>
                        <li><strong>AI Processing:</strong> The system will display a spinner while it converts the PDF to an image and sends it to the Gemini AI for analysis.</li>
                        <li><strong>Manage on Kanban Board:</strong> Once processed, the new boleto card will appear in the "To Pay" column.</li>
                        <li><strong>Update Status:</strong> Click the action buttons on a card to move it through the workflow: "Mark as Paid" moves it to "Verifying," and "Verify Payment" moves it to "Paid."</li>
                        <li><strong>View/Delete:</strong> You can view the original PDF or delete a boleto using the icons on each card.</li>
                    </ol>
                </Section>

                 <Section title="6. Future Improvements">
                    <p>The current architecture with a simulated API is excellent for demos and rapid development. The next logical step is to connect it to a real backend.</p>
                    <ul>
                       <li><strong>Backend API:</strong> Develop a RESTful or GraphQL API (e.g., using Node.js, Python, or Go) to handle CRUD operations for boletos.</li>
                       <li><strong>Database Integration:</strong> Use a robust database like PostgreSQL or MySQL.</li>
                       <li><strong>User Authentication:</strong> Replace the simple session-based login with a secure authentication system (e.g., JWT, OAuth) that manages real user accounts and roles.</li>
                       <li><strong>Real-time Updates:</strong> Implement WebSockets to reflect changes on the Kanban board in real-time for all connected users.</li>
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