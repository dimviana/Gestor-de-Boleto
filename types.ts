
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