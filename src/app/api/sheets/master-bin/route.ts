import { NextRequest, NextResponse } from 'next/server';
import {
  appendRow, getRows, updateRow,
  SHEET_MASTER_BIN, HEADERS_BIN, ensureSheetHeaders
} from '@/lib/google-sheets';
import { MasterBin } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const warehouse = searchParams.get('warehouse');

    const rows = await getRows(SHEET_MASTER_BIN);
    if (rows.length <= 1) return NextResponse.json([]);

    const dataRows = rows.slice(1);
    const bins: MasterBin[] = dataRows.map((row, index) => ({
      rowIndex: index,
      binCode: row[0] || '',
      description: row[1] || '',
      warehouse: row[2] || '',
      active: row[3]?.toLowerCase() === 'true' || row[3] === '1' || row[3] === 'Ya',
    })).filter((b) => b.binCode);

    let filtered = bins;
    if (activeOnly) filtered = filtered.filter((b) => b.active);
    if (warehouse) filtered = filtered.filter((b) => b.warehouse === warehouse);

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error('Error fetching Master Bin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: MasterBin = await req.json();
    await ensureSheetHeaders(SHEET_MASTER_BIN, HEADERS_BIN);
    const values = [
      body.binCode,
      body.description,
      body.warehouse,
      body.active ? 'Ya' : 'Tidak',
    ];
    await appendRow(SHEET_MASTER_BIN, values);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding bin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { rowIndex, ...bin } = body as MasterBin & { rowIndex: number };
    const values = [
      bin.binCode,
      bin.description,
      bin.warehouse,
      bin.active ? 'Ya' : 'Tidak',
    ];
    await updateRow(SHEET_MASTER_BIN, rowIndex, values);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating bin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
