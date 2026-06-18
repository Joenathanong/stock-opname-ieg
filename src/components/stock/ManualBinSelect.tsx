'use client';
import { useState, useEffect } from 'react';
import { MasterBin } from '@/types';
import { Search } from 'lucide-react';

interface ManualBinSelectProps {
  warehouse?: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: (value: string) => void;
}

export function ManualBinSelect({ warehouse, value, onChange, onConfirm }: ManualBinSelectProps) {
  const [bins, setBins] = useState<MasterBin[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ active: 'true' });
    if (warehouse) params.append('warehouse', warehouse);
    fetch(`/api/sheets/master-bin?${params}`)
      .then((r) => r.json())
      .then((data) => setBins(Array.isArray(data) ? data : []))
      .catch(() => setBins([]))
      .finally(() => setLoading(false));
  }, [warehouse]);

  const filtered = bins.filter(
    (b) =>
      b.binCode.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        Pilih Lokasi Bin
      </label>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
        <input
          type="text"
          placeholder="Cari kode bin atau deskripsi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {loading ? (
        <div className="text-center py-4 text-sm text-gray-500">Memuat data bin...</div>
      ) : (
        <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">Tidak ada bin ditemukan</div>
          ) : (
            filtered.map((bin) => (
              <button
                key={bin.binCode}
                type="button"
                onClick={() => {
                  onChange(bin.binCode);
                  onConfirm(bin.binCode);
                }}
                className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                  value === bin.binCode ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <span className="font-medium text-sm text-gray-900 dark:text-white">{bin.binCode}</span>
                {bin.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{bin.description}</span>
                )}
                {bin.warehouse && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">({bin.warehouse})</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
