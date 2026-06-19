import { NextResponse } from 'next/server';
import { getRows } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

const SHEET = 'Resume_SO';

// Column indices (0-based)
// Material OCS | Material SAP IEG | Material SAP EJI | Kategori Produk |
// Barcode Produk | Barcode B-POM | Jumlah OCS | Hasil SO | Selisih

export interface SOItem {
  materialOCS: string;
  materialIEG: string;
  materialEJI: string;
  kategori: string;
  barcodeProduct: string;
  barcodeBPOM: string;
  jumlahOCS: number;
  hasilSO: number | null; // null = belum dihitung
  selisih: number | null;
  status: 'belum' | 'sesuai' | 'surplus' | 'defisit';
}

function parseNum(v: string | undefined): number {
  if (v === undefined || v === '') return 0;
  return parseFloat(v.replace(/,/g, '.')) || 0;
}

function parseNullable(v: string | undefined): number | null {
  if (v === undefined || v.trim() === '') return null;
  const n = parseFloat(v.replace(/,/g, '.'));
  return isNaN(n) ? null : n;
}

export async function GET() {
  try {
    const rows = await getRows(SHEET);
    if (rows.length <= 1) {
      return NextResponse.json({
        items: [], stats: {
          total: 0, dihitung: 0, belum: 0, sesuai: 0,
          surplus: 0, defisit: 0, progress: 0,
          totalSelisihPlus: 0, totalSelisihMinus: 0,
        },
        top10Selisih: [], top10Surplus: [], top10Defisit: [],
        byKategori: [], lastUpdated: new Date().toISOString(),
      });
    }

    const dataRows = rows.slice(1);

    const items: SOItem[] = dataRows
      .map((row) => {
        const jumlahOCS = parseNum(row[6]);
        const hasilSO = parseNullable(row[7]);
        const selisih = parseNullable(row[8]);

        let status: SOItem['status'] = 'belum';
        if (hasilSO !== null) {
          if (selisih === null || selisih === 0) status = 'sesuai';
          else if (selisih > 0) status = 'surplus';
          else status = 'defisit';
        }

        return {
          materialOCS: row[0]?.trim() || '',
          materialIEG: row[1]?.trim() || '',
          materialEJI: row[2]?.trim() || '',
          kategori: row[3]?.trim() || 'Lainnya',
          barcodeProduct: row[4]?.trim() || '',
          barcodeBPOM: row[5]?.trim() || '',
          jumlahOCS,
          hasilSO,
          selisih,
          status,
        } as SOItem;
      })
      .filter((i) => i.materialOCS || i.materialIEG || i.materialEJI);

    const total = items.length;
    const dihitung = items.filter((i) => i.hasilSO !== null).length;
    const belum = total - dihitung;
    const sesuai = items.filter((i) => i.status === 'sesuai').length;
    const surplus = items.filter((i) => i.status === 'surplus').length;
    const defisit = items.filter((i) => i.status === 'defisit').length;
    const progress = total > 0 ? Math.round((dihitung / total) * 100) : 0;

    const totalSelisihPlus = items
      .filter((i) => (i.selisih ?? 0) > 0)
      .reduce((s, i) => s + (i.selisih ?? 0), 0);
    const totalSelisihMinus = items
      .filter((i) => (i.selisih ?? 0) < 0)
      .reduce((s, i) => s + (i.selisih ?? 0), 0);

    // Top 10 selisih terbesar (absolute)
    const top10Selisih = [...items]
      .filter((i) => i.selisih !== null && i.selisih !== 0)
      .sort((a, b) => Math.abs(b.selisih ?? 0) - Math.abs(a.selisih ?? 0))
      .slice(0, 10);

    // Top 10 surplus (fisik > OCS)
    const top10Surplus = [...items]
      .filter((i) => (i.selisih ?? 0) > 0)
      .sort((a, b) => (b.selisih ?? 0) - (a.selisih ?? 0))
      .slice(0, 10);

    // Top 10 defisit (fisik < OCS)
    const top10Defisit = [...items]
      .filter((i) => (i.selisih ?? 0) < 0)
      .sort((a, b) => (a.selisih ?? 0) - (b.selisih ?? 0))
      .slice(0, 10);

    // Progress per Kategori
    const kategoriMap: Record<string, {
      kategori: string; total: number; dihitung: number;
      sesuai: number; surplus: number; defisit: number; belum: number;
    }> = {};

    items.forEach((item) => {
      const k = item.kategori || 'Lainnya';
      if (!kategoriMap[k]) {
        kategoriMap[k] = { kategori: k, total: 0, dihitung: 0, sesuai: 0, surplus: 0, defisit: 0, belum: 0 };
      }
      kategoriMap[k].total++;
      if (item.status === 'belum') {
        kategoriMap[k].belum++;
      } else {
        kategoriMap[k].dihitung++;
        kategoriMap[k][item.status]++;
      }
    });

    const byKategori = Object.values(kategoriMap)
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      stats: {
        total, dihitung, belum, sesuai, surplus, defisit, progress,
        totalSelisihPlus, totalSelisihMinus,
      },
      top10Selisih,
      top10Surplus,
      top10Defisit,
      byKategori,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Monitor API]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
