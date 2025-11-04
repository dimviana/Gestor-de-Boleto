
import React, { useState, useEffect, useRef } from 'react';
import Spinner from './Spinner';

declare const pdfjsLib: any;

interface PdfViewerProps {
  fileData: string; // base64 encoded string
}

const PdfViewer: React.FC<PdfViewerProps> = ({ fileData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const byteCharacters = atob(fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const pdfDoc = await pdfjsLib.getDocument({ data: byteArray }).promise;
        setPdf(pdfDoc);
      } catch (e) {
        console.error("Error loading PDF for viewer:", e);
        setError("Failed to load PDF file.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [fileData]);

  useEffect(() => {
    if (!pdf || !containerRef.current) return;

    const renderPages = async () => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = ''; // Clear previous pages
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto 1rem auto';
        canvas.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        canvas.style.borderRadius = '0.5rem';
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';


        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        containerRef.current.appendChild(canvas);
        
        if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
        }
      }
    };

    renderPages();
  }, [pdf]);

  return (
    <div className="bg-gray-200 dark:bg-gray-900 p-2 sm:p-4 rounded-lg">
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Spinner />
          <p className="ml-4 text-gray-600 dark:text-gray-300">Loading PDF...</p>
        </div>
      )}
      {error && <div className="text-center text-red-500">{error}</div>}
      <div ref={containerRef}></div>
    </div>
  );
};

export default PdfViewer;
