export enum BoletoStatus {
  TO_PAY = 'PAGAR',
  VERIFYING = 'VERIFICAR',
  PAID = 'PAGO',
}

export interface Boleto {
  id: string;
  recipient: string | null;
  dueDate: string | null;
  amount: number | null;
  barcode: string | null;
  guideNumber: string | null;
  status: BoletoStatus;
  fileName: string;
  fileData: string;
}

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  role: Role;
}

// Represents a user as stored in the database (localStorage)
export interface RegisteredUser extends User {
  password?: string;
}

// New types for the logging system
export type LogAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER_USER'
  | 'CREATE_BOLETO'
  | 'UPDATE_BOLETO_STATUS'
  | 'DELETE_BOLETO'
  | 'DELETE_USER'
  | 'ADMIN_CREATE_USER'
  | 'ADMIN_UPDATE_USER';

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string for date and time
  userId: string;
  username: string;
  action: LogAction;
  details: string; // e.g., "Updated boleto 'ACME-123' status to PAID"
}