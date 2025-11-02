export enum BoletoStatus {
  TO_PAY = 'PAGAR',
  VERIFYING = 'VERIFICAR',
  PAID = 'PAGO',
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  address: string;
}

export interface Boleto {
  id: string;
  recipient: string | null; // Beneficiário
  drawee: string | null; // Sacado
  documentDate: string | null;
  dueDate: string | null;
  amount: number | null;
  discount: number | null;
  interestAndFines: number | null;
  barcode: string | null;
  guideNumber: string | null;
  pixQrCodeText: string | null; // The copy-paste string
  status: BoletoStatus;
  fileName: string;
  fileData: string;
  companyId: string; // Added for multi-tenancy
  comments: string | null;
}

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  role: Role;
  companyId?: string; // Added for multi-tenancy
}

// Represents a user as stored in the database (localStorage)
export interface RegisteredUser extends User {
  password?: string;
}

export type ProcessingMethod = 'ai' | 'regex';

export type Theme = 'light' | 'dark' | 'system';


// New types for the logging system
export type LogAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER_USER'
  | 'CREATE_BOLETO'
  | 'UPDATE_BOLETO_STATUS'
  | 'UPDATE_BOLETO_COMMENT'
  | 'DELETE_BOLETO'
  | 'DELETE_USER'
  | 'ADMIN_CREATE_USER'
  | 'ADMIN_UPDATE_USER'
  | 'ADMIN_CHANGE_SETTINGS';

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string for date and time
  userId: string;
  username: string;
  action: LogAction;
  details: string; // e.g., "Updated boleto 'ACME-123' status to PAID"
}

export interface Notification {
  boleto: Boleto;
  type: 'overdue' | 'dueSoon';
  daysUntilDue: number;
}

// New type for AI settings
export interface AiSettings {
  model: string;
  temperature: number;
  topK: number;
  topP: number;
}

// Add module declaration to fix TypeScript error for pdfjs-dist
// FIX: Corrected module path for augmentation.
declare module 'pdfjs-dist/build/pdf.js';