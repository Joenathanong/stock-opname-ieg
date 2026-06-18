import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ParsedBarcodeGB } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseGudangBesarBarcode(raw: string): ParsedBarcodeGB | null {
  const fields = raw.trim().split(';');
  if (fields.length < 8) return null;
  return {
    materialId: fields[0].trim(),
    batchDoc: fields[1].trim(),
    unitCtn: fields[2].trim(),
    qtyPerBox: parseFloat(fields[3].trim()),
    unitPcs: fields[4].trim(),
    barcode: fields[5].trim(),
    description: fields[6].trim(),
    wh: fields[7].trim(),
  };
}

export function formatQty(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toString();
}

export function formatTimestamp(): string {
  return new Date().toISOString();
}

export function formatDate(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
