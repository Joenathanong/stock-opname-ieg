import { google } from 'googleapis';

export const SHEET_GUDANG_BESAR = 'SO_Gudang_Besar';
export const SHEET_GUDANG_KT = 'SO_Gudang_Kecil_Transit';
export const SHEET_MASTER_BIN = 'Master_Bin';

export const HEADERS_GB = [
  'Timestamp', 'Tanggal', 'User', 'Shift', 'Material ID', 'Batch/Doc',
  'Unit CTN', 'Qty Per Box', 'Unit PCS', 'Barcode', 'Deskripsi', 'WH',
  'Qty Karton', 'Qty PCS Total', 'Lokasi', 'Catatan', 'Status', 'Potensi Double'
];
export const HEADERS_KT = [
  'Timestamp', 'Tanggal', 'User', 'Shift', 'Kategori', 'Barcode',
  'Qty PCS', 'Lokasi', 'Catatan', 'Status', 'Potensi Double'
];
export const HEADERS_BIN = ['Kode Bin', 'Deskripsi', 'Gudang', 'Aktif'];

function getAuth() {
  return new google.auth.JWT(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    undefined,
    process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

export async function ensureSheetHeaders(sheetName: string, headers: string[]) {
  const sheets = getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
    });
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    }
  } catch (e) {
    // Sheet might not exist, ignore
  }
}

export async function appendRow(sheetName: string, values: (string | number | boolean)[]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

export async function getRows(sheetName: string, range?: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: range || `${sheetName}!A:Z`,
  });
  return (res.data.values || []) as string[][];
}

export async function updateRow(sheetName: string, rowIndex: number, values: (string | number | boolean)[]): Promise<void> {
  const sheets = getSheets();
  // rowIndex is 0-based index of data rows (excluding header)
  // Header is row 1, data starts at row 2
  const row = rowIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}
