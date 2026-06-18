export type UserRole = 'administrator' | 'operator';
export type ShiftType = '1' | '2' | '3' | 'Non-Shift';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedBarcodeGB {
  materialId: string;
  batchDoc: string;
  unitCtn: string;
  qtyPerBox: number;
  unitPcs: string;
  barcode: string;
  description: string;
  wh: string;
}

export interface StockEntryGB {
  id?: string;
  timestamp: string;
  date: string;
  user: string;
  shift: string;
  materialId: string;
  batchDoc: string;
  unitCtn: string;
  qtyPerBox: number;
  unitPcs: string;
  barcode: string;
  description: string;
  wh: string;
  qtyCarton: number;
  qtyPcsTotal: number;
  location: string;
  notes: string;
  status: 'saved' | 'pending' | 'error';
  potentialDouble: boolean;
  rowIndex?: number;
}

export interface StockEntryKT {
  id?: string;
  timestamp: string;
  date: string;
  user: string;
  shift: string;
  category: 'Gudang Kecil' | 'Gudang Transit';
  barcode: string;
  qtyPcs: number;
  location: string;
  notes: string;
  status: 'saved' | 'pending' | 'error';
  potentialDouble: boolean;
  rowIndex?: number;
}

export interface MasterBin {
  binCode: string;
  description: string;
  warehouse: string;
  active: boolean;
  rowIndex?: number;
}

export interface OfflineQueueItem {
  id?: number;
  type: 'gudang-besar' | 'gudang-kecil-transit';
  data: StockEntryGB | StockEntryKT;
  attempts: number;
  createdAt: number;
  lastAttempt?: number;
}
