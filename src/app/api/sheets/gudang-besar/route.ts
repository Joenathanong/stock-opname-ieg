import { NextRequest, NextResponse } from 'next/server';
import {
  appendRow, getRows, updateRow,
  SHEET_GUDANG_BESAR, HEADERS_GB, ensureSheetHeaders
} from '@/lib/google-sheets';
import { StockEntryGB } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: StockEntryGB = await req.json();
    await ensureSheetHeaders(SHEET_GUDANG_BESAR, HEADERS_GB);
    const values = [
      body.timestamp,
      body.date,
      body.user,
      body.shift,
      body.materialId,
      body.batchDoc,
      body.unitCtn,
      body.qtyPerBox,
      body.unitPcs,
      body.barcode,
      body.description,
      body.wh,
      body.qtyCarton,
      body.qtyPcsTotal,
      body.location,
      body.notes,
      body.status,
      body.potentialDouble ? 'Ya' : 'Tidak',
    ];
    await appendRow(SHEET_GUDANG_BESAR, values);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error appending to Gudang Besar sheet:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user = searchParams.get('user');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const rows = await getRows(SHEET_GUDANG_BESAR);
    if (rows.length <= 1) return NextResponse.json([]);

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const entries: StockEntryGB[] = dataRows.map((row, index) => ({
      rowIndex: index,
      timestamp: row[0] || '',
      date: row[1] || '',
      user: row[2] || '',
      shift: row[3] || '',
      materialId: row[4] || '',
      batchDoc: row[5] || '',
      unitCtn: row[6] || '',
      qtyPerBox: parseFloat(row[7]) || 0,
      unitPcs: row[8] || '',
      barcode: row[9] || '',
      description: row[10] || '',
      wh: row[11] || '',
      qtyCarton: parseFloat(row[12]) || 0,
      qtyPcsTotal: parseFloat(row[13]) || 0,
      location: row[14] || '',
      notes: row[15] || '',
      status: (row[16] as 'saved' | 'pending' | 'error') || 'saved',
      potentialDouble: row[17] === 'Ya',
    }));

    let filtered = entries;
    if (user) filtered = filtered.filter((e) => e.user === user);
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
    console.error('Error fetching Gudang Besar sheet:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { rowIndex, ...entry } = body as StockEntryGB & { rowIndex: number };

    const values = [
      entry.timestamp,
      entry.date,
      entry.user,
      entry.shift,
      entry.materialId,
      entry.batchDoc,
      entry.unitCtn,
      entry.qtyPerBox,
      entry.unitPcs,
      entry.barcode,
      entry.description,
      entry.wh,
      entry.qtyCarton,
      entry.qtyPcsTotal,
      entry.location,
      entry.notes,
      entry.status,
      entry.potentialDouble ? 'Ya' : 'Tidak',
    ];

    await updateRow(SHEET_GUDANG_BESAR, rowIndex, values);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating Gudang Besar row:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
