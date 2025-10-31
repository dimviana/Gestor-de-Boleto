
export type Language = 'pt' | 'en';

const pt = {
    loginTitle: 'Boleto Manager AI',
    loginSubtitle: 'Gerencie seus boletos com o poder da IA do Gemini',
    loginButton: 'Acessar o Painel',
    logoutButton: 'Sair',
    uploadCTA: 'Clique para enviar',
    uploadOrDrag: 'ou arraste e solte',
    uploadHint: 'Apenas arquivos PDF',
    kanbanTitleToDo: 'Pagar',
    kanbanTitleVerifying: 'Verificando',
    kanbanTitlePaid: 'Pago',
    totalToPay: 'Total a Pagar',
    totalVerifying: 'Total em Verificação',
    totalPaid: 'Total Pago',
    markAsPaid: 'Marcar como Pago',
    verifyPayment: 'Verificar Pagamento',
    paymentCompleted: 'Pagamento Concluído',
    recipientNotFound: 'Destinatário não encontrado',
    dueDate: 'Vencimento:',
    amount: 'Valor:',
    barcode: 'Código de Barras:',
    guideNumber: 'Nº do Documento:',
    notAvailable: 'N/A',
    openPdf: 'Abrir PDF original',
    documentationTitle: 'Documentação',
    downloadPdf: 'Baixar Documentação em PDF',
    processingErrorTitle: 'Erro ao Processar',
    processingErrorText: 'Ocorreu um erro ao tentar processar o arquivo PDF com a IA. Verifique o console para mais detalhes.',
    duplicateErrorTitle: 'Boleto Duplicado',
    duplicateErrorText: 'Um boleto com o número de documento "{{guideNumber}}" já existe.',
    invalidGuideErrorTitle: 'Dados Inválidos',
    invalidGuideErrorText: 'O número do documento não pôde ser extraído do boleto. Verifique o arquivo e tente novamente.',
    genericErrorTitle: 'Ocorreu um Erro',
    genericErrorText: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
    pdfProcessingError: 'Ocorreu um erro ao processar o boleto com a IA.',
    geminiPrompt: `
        Você é um assistente especialista em extrair informações de boletos bancários brasileiros a partir de uma imagem.
        Analise a imagem e retorne um objeto JSON com as seguintes informações. Se uma informação não for encontrada, retorne null para aquele campo.
        A data de vencimento deve estar no formato AAAA-MM-DD.
        O valor deve ser um número, usando ponto como separador decimal.
        - recipient: O nome do beneficiário/cedente.
        - dueDate: A data de vencimento.
        - amount: O valor do documento.
        - barcode: A linha digitável completa, com todos os números e pontos.
        - guideNumber: O "Número do Documento".
    `,
};

const en: typeof pt = {
    loginTitle: 'Boleto Manager AI',
    loginSubtitle: 'Manage your payment slips with the power of Gemini AI',
    loginButton: 'Access Dashboard',
    logoutButton: 'Logout',
    uploadCTA: 'Click to upload',
    uploadOrDrag: 'or drag and drop',
    uploadHint: 'PDF files only',
    kanbanTitleToDo: 'To Pay',
    kanbanTitleVerifying: 'Verifying',
    kanbanTitlePaid: 'Paid',
    totalToPay: 'Total to Pay',
    totalVerifying: 'Total Verifying',
    totalPaid: 'Total Paid',
    markAsPaid: 'Mark as Paid',
    verifyPayment: 'Verify Payment',
    paymentCompleted: 'Payment Completed',
    recipientNotFound: 'Recipient not found',
    dueDate: 'Due Date:',
    amount: 'Amount:',
    barcode: 'Barcode:',
    guideNumber: 'Document No:',
    notAvailable: 'N/A',
    openPdf: 'Open original PDF',
    documentationTitle: 'Documentation',
    downloadPdf: 'Download Documentation as PDF',
    processingErrorTitle: 'Processing Error',
    processingErrorText: 'An error occurred while trying to process the PDF file with the AI. Check the console for more details.',
    duplicateErrorTitle: 'Duplicate Boleto',
    duplicateErrorText: 'A boleto with document number "{{guideNumber}}" already exists.',
    invalidGuideErrorTitle: 'Invalid Data',
    invalidGuideErrorText: 'The document number could not be extracted from the boleto. Please check the file and try again.',
    genericErrorTitle: 'An Error Occurred',
    genericErrorText: 'An unexpected error occurred. Please try again.',
    pdfProcessingError: 'An error occurred while processing the boleto with the AI.',
    geminiPrompt: `
        You are an expert assistant specialized in extracting information from Brazilian bank slips (boletos) from an image.
        Analyze the image and return a JSON object with the following information. If a piece of information is not found, return null for that field.
        The due date must be in YYYY-MM-DD format.
        The amount must be a number, using a period as the decimal separator.
        - recipient: The name of the beneficiary/payee.
        - dueDate: The due date.
        - amount: The document amount.
        - barcode: The complete digitable line (linha digitável), with all numbers and periods.
        - guideNumber: The "Número do Documento" (Document Number).
    `,
};

export const translations = { pt, en };

export type TranslationKey = keyof typeof pt;
