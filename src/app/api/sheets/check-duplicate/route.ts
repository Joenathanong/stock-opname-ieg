import { NextRequest, NextResponse } from 'next/server';
import { getRows, SHEET_GUDANG_BESAR, SHEET_GUDANG_KT } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { barcode, location, sheet } = body as {
      barcode: string;
      location: string;
      sheet: 'gudang-besar' | 'gudang-kecil-transit';
    };

    if (!barcode || !location) {
      return NextResponse.json({ isDuplicate: false, count: 0 });
    }

    const sheetName = sheet === 'gudang-besar' ? SHEET_GUDANG_BESAR : SHEET_GUDANG_KT;
    const rows = await getRows(sheetName);

    if (rows.length <= 1) {
      return NextResponse.json({ isDuplicate: false, count: 0 });
    }

    const dataRows = rows.slice(1);

    // For gudang-besar: barcode is col 9 (index 9), location is col 14 (index 14)
    // For gudang-kecil-transit: barcode is col 5 (index 5), location is col 7 (index 7)
    const barcodeIdx = sheet === 'gudang-besar' ? 9 : 5;
    const locationIdx = sheet === 'gudang-besar' ? 14 : 7;

    const matches = dataRows.filter(
      (row) =>
        row[barcodeIdx]?.trim().toLowerCase() === barcode.trim().toLowerCase() &&
        row[locationIdx]?.trim().toLowerCase() === location.trim().toLowerCase()
    );

    return NextResponse.json({
      isDuplicate: matches.length > 0,
      count: matches.length,
    });
  } catch (error: any) {
    console.error('Error checking duplicate:', error);
    return NextResponse.json({ isDuplicate: false, count: 0 });
  }
}
