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
  companyId: string | null;
  token?: string;
}

// Represents a user as stored in the database
export interface RegisteredUser extends Omit<User, 'token'>{
  password?: string;
}

export type ProcessingMethod = 'ai' | 'regex';

export type Theme = 'light' | 'dark' | 'system';


// New types for the logging system
export type LogAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER_USER'
  | 'CREATE_BOLEto'
  | 'UPDATE_BOLETO_STATUS'
  | 'UPDATE_BOLETO_COMMENT'
  | 'DELETE_BOLETO'
  | 'DELETE_USER'
  | 'ADMIN_CREATE_USER'
  | 'ADMIN_UPDATE_USER'
  | 'ADMIN_CHANGE_SETTINGS'
  | 'ADMIN_CREATE_COMPANY'
  | 'ADMIN_UPDATE_COMPANY'
  | 'ADMIN_DELETE_COMPANY';

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

// New type for System Update Notifications
export interface SystemNotification {
    type: 'system';
    message: string;
    version: string;
    url: string;
    sha: string;
}

export type AnyNotification = Notification | SystemNotification;

// New type for AI settings
export interface AiSettings {
  model: string;
  temperature: number;
  topK: number;
  topP: number;
}

// New type for VPS SSH settings
export interface VpsSettings {
  id: string;
  company_id: string;
  hostname: string;
  username: string;
  password?: string; // Should be handled securely
  ssh_port: number;
  project_path?: string; // Path to project on remote server
}

// New types for SSL management
export interface SslSettings {
    domain: string;
}

export interface SslStatus {
    isValid: boolean;
    expiresAt: string | null;
    issuedAt: string | null;
    error?: string;
}