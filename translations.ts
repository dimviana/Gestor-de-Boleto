export const translations = {
  en: {
    // Login
    loginTitle: 'Boleto Manager AI',
    loginSubtitle: 'Intelligent control of your payments.',
    loginButton: 'Access Dashboard',
    // Header
    logoutButton: 'Logout',
    // Dashboard
    uploadTitle: 'AI is analyzing your document...',
    errorTitle: 'Error!',
    columnToPay: 'To Pay',
    columnVerifying: 'Verifying',
    columnPaid: 'Paid',
    // File Upload
    uploadCTA: 'Click to upload',
    uploadOrDrag: 'or drag and drop',
    uploadHint: 'PDF files only',
    // Kanban Column
    emptyColumn: 'No items in this category.',
    // Boleto Card
    recipientNotFound: 'Recipient not found',
    dueDate: 'Due Date:',
    amount: 'Amount:',
    guideNumber: 'Guide Number:',
    barcode: 'Barcode:',
    notAvailable: 'N/A',
    markAsPaid: 'Mark as Paid',
    verifyPayment: 'Verify Payment',
    paymentCompleted: 'Payment Completed',
    openPdf: 'Open Original PDF',
    // Errors
    duplicateGuideError: 'A boleto with guide number "{{guideNumber}}" already exists.',
    invalidGuideError: 'Could not extract a valid Guide Number from the PDF. Cannot add boleto.',
    pdfProcessingError: 'Failed to extract information from the PDF. The document might be invalid or the AI service is unavailable.',
    unknownError: 'An unknown error occurred.',
    // Gemini Prompt
    geminiPrompt: `Analyze this image of a Brazilian 'boleto' (payment slip). Extract the recipient (beneficiário), due date (vencimento), amount (valor), the full barcode number (linha digitável), and the document number (número do documento or similar identifier). Return the data in the specified JSON format. For dueDate, use YYYY-MM-DD. If a document number isn't present, return null for guideNumber.`,
  },
  pt: {
    // Login
    loginTitle: 'Gestor de Boletos AI',
    loginSubtitle: 'Controle inteligente dos seus pagamentos.',
    loginButton: 'Acessar Painel',
    // Header
    logoutButton: 'Sair',
    // Dashboard
    uploadTitle: 'A IA está analisando seu documento...',
    errorTitle: 'Erro!',
    columnToPay: 'PAGAR',
    columnVerifying: 'VERIFICAR',
    columnPaid: 'PAGO',
    // File Upload
    uploadCTA: 'Clique para enviar',
    uploadOrDrag: 'ou arraste e solte',
    uploadHint: 'Apenas arquivos PDF',
    // Kanban Column
    emptyColumn: 'Nenhum item nesta categoria.',
    // Boleto Card
    recipientNotFound: 'Beneficiário não encontrado',
    dueDate: 'Vencimento:',
    amount: 'Valor:',
    guideNumber: 'Nº da Guia:',
    barcode: 'Código de Barras:',
    notAvailable: 'N/D',
    markAsPaid: 'Marcar como Pago',
    verifyPayment: 'Verificar Pagamento',
    paymentCompleted: 'Pagamento Concluído',
    openPdf: 'Abrir PDF Original',
    // Errors
    duplicateGuideError: 'Um boleto com o número de guia "{{guideNumber}}" já existe.',
    invalidGuideError: 'Não foi possível extrair um Número de Guia válido do PDF. O boleto não pode ser adicionado.',
    pdfProcessingError: 'Falha ao extrair informações do PDF. O documento pode ser inválido ou o serviço de IA está indisponível.',
    unknownError: 'Ocorreu um erro desconhecido.',
    // Gemini Prompt
    geminiPrompt: `Analise esta imagem de um boleto brasileiro. Extraia o beneficiário, a data de vencimento, o valor, a linha digitável completa, e o número do documento (ou identificador similar). Retorne os dados no formato JSON especificado. Para a data de vencimento, use o formato YYYY-MM-DD. Se o número do documento não estiver presente, retorne null para guideNumber.`,
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations['en'];
