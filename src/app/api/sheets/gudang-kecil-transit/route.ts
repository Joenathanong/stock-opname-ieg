import { NextRequest, NextResponse } from 'next/server';
import {
  appendRow, getRows, updateRow,
  SHEET_GUDANG_KT, HEADERS_KT, ensureSheetHeaders
} from '@/lib/google-sheets';
import { StockEntryKT } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: StockEntryKT = await req.json();
    await ensureSheetHeaders(SHEET_GUDANG_KT, HEADERS_KT);
    const values = [
      body.timestamp,
      body.date,
      body.user,
      body.shift,
      body.category,
      body.barcode,
      body.qtyPcs,
      body.location,
      body.notes,
      body.status,
      body.potentialDouble ? 'Ya' : 'Tidak',
    ];
    await appendRow(SHEET_GUDANG_KT, values);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error appending to Gudang KT sheet:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user = searchParams.get('user');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');

    const rows = await getRows(SHEET_GUDANG_KT);
    if (rows.length <= 1) return NextResponse.json([]);

    const dataRows = rows.slice(1);
    const entries: StockEntryKT[] = dataRows.map((row, index) => ({
      rowIndex: index,
      timestamp: row[0] || '',
      date: row[1] || '',
      user: row[2] || '',
      shift: row[3] || '',
      category: (row[4] as 'Gudang Kecil' | 'Gudang Transit') || 'Gudang Kecil',
      barcode: row[5] || '',
      qtyPcs: parseFloat(row[6]) || 0,
      location: row[7] || '',
      notes: row[8] || '',
      status: (row[9] as 'saved' | 'pending' | 'error') || 'saved',
      potentialDouble: row[10] === 'Ya',
    }));

    let filtered = entries;
    if (user) filtered = filtered.filter((e) => e.user === user);
    if (category) filtered = filtered.filter((e) => e.category === category);
    if (startDate) {
      filtered = filtered.filter((e) => {
        const entryDate = new Date(e.timestamp);
        return entryDate >= new Date(startDate);
      });
    }
    if (endDate) {
      filtered = filtered.filter((e) => {
        const entryDate = new Date(e.timestamp);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return entryDate <= end;
      });
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error('Error fetching Gudang KT sheet:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { rowIndex, ...entry } = body as StockEntryKT & { rowIndex: number };

    const values = [
      entry.timestamp,
      entry.date,
      entry.user,
      entry.shift,
      entry.category,
      entry.barcode,
      entry.qtyPcs,
      entry.location,
      entry.notes,
      entry.status,
      entry.potentialDouble ? 'Ya' : 'Tidak',
    ];

    await updateRow(SHEET_GUDANG_KT, rowIndex, values);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating Gudang KT row:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
