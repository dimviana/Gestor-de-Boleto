
export type Language = 'pt' | 'en';

const pt = {
    loginTitle: 'Boleto Manager AI',
    loginSubtitle: 'Gerencie seus boletos com o poder da IA do Gemini',
    loginButton: 'Acessar o Painel',
    createAccountButton: 'Criar Conta',
    logoutButton: 'Sair',
    loginTab: 'Entrar',
    registerTab: 'Cadastrar',
    emailLabel: 'Email',
    passwordLabel: 'Senha',
    passwordLabelRegister: 'Senha (mínimo 6 caracteres)',
    emailPlaceholder: 'seu@email.com',
    passwordPlaceholder: '••••••••',
    adminHint: "Para acesso de administrador, digite 'admin' no campo de email e clique em Entrar.",
    registrationSuccess: 'Cadastro realizado com sucesso! Faça o login para continuar.',
    authErrorInvalidCredentials: 'Credenciais inválidas. Por favor, tente novamente.',
    authErrorInvalidEmail: 'Por favor, insira um endereço de e-mail válido.',
    authErrorPasswordLength: 'A senha deve ter pelo menos 6 caracteres.',
    authErrorEmailExists: 'Uma conta com este e-mail já existe.',
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
    confirmUserDeletion: 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
    deleteUserError: 'Não foi possível excluir o usuário. Você não pode excluir a si mesmo.',
    deleteSelfError: 'Você não pode excluir sua própria conta.',
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
    createAccountButton: 'Create Account',
    logoutButton: 'Logout',
    loginTab: 'Login',
    registerTab: 'Register',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    passwordLabelRegister: 'Password (min. 6 characters)',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: '••••••••',
    adminHint: "For admin access, type 'admin' in the email field and click Login.",
    registrationSuccess: 'Registration successful! Please log in to continue.',
    authErrorInvalidCredentials: 'Invalid credentials. Please try again.',
    authErrorInvalidEmail: 'Please enter a valid email address.',
    authErrorPasswordLength: 'Password must be at least 6 characters long.',
    authErrorEmailExists: 'An account with this email already exists.',
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
    confirmUserDeletion: 'Are you sure you want to delete this user? This action cannot be undone.',
    deleteUserError: 'Could not delete the user. You cannot delete yourself.',
    deleteSelfError: 'You cannot delete your own account.',
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