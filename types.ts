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