import { NextRequest, NextResponse } from 'next/server';
import { getRows, SHEET_GUDANG_BESAR, SHEET_GUDANG_KT } from '@/lib/google-sheets';
import { StockEntryGB, StockEntryKT } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user = searchParams.get('user');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type'); // 'gb', 'kt', or null for all

    const results: ((StockEntryGB | StockEntryKT) & { _sheet: string })[] = [];

    // Fetch Gudang Besar
    if (!type || type === 'gb') {
      const gbRows = await getRows(SHEET_GUDANG_BESAR);
      if (gbRows.length > 1) {
        const dataRows = gbRows.slice(1);
        dataRows.forEach((row, index) => {
          results.push({
            _sheet: 'gudang-besar',
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
          } as StockEntryGB & { _sheet: string });
        });
      }
    }

    // Fetch Gudang Kecil & Transit
    if (!type || type === 'kt') {
      const ktRows = await getRows(SHEET_GUDANG_KT);
      if (ktRows.length > 1) {
        const dataRows = ktRows.slice(1);
        dataRows.forEach((row, index) => {
          results.push({
            _sheet: 'gudang-kecil-transit',
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
          } as StockEntryKT & { _sheet: string });
        });
      }
    }

    // Filter
    let filtered = results;
    if (user) filtered = filtered.filter((e) => e.user === user);
    if (startDate) {
      filtered = filtered.filter((e) => {
        const entryDate = new Date(e.timestamp);
        return !isNaN(entryDate.getTime()) && entryDate >= new Date(startDate);
      });
    }
    if (endDate) {
      filtered = filtered.filter((e) => {
        const entryDate = new Date(e.timestamp);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return !isNaN(entryDate.getTime()) && entryDate <= end;
      });
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return tB - tA;
    });

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
