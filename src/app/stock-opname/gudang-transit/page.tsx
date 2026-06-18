'use client';
import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BarcodeInput } from '@/components/stock/BarcodeInput';
import { ManualBinSelect } from '@/components/stock/ManualBinSelect';
import { ScanHistoryTable } from '@/components/stock/ScanHistoryTable';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useShift } from '@/contexts/ShiftContext';
import { useToast } from '@/hooks/useToast';
import { addToQueue } from '@/lib/offline-queue';
import { formatTimestamp, formatDate } from '@/lib/utils';
import { StockEntryKT } from '@/types';
import { Truck, MapPin, RotateCcw, AlertTriangle, RefreshCw, ScanLine, Edit3 } from 'lucide-react';

export default function GudangTransitPage() {
  const { user } = useAuth();
  const { shift } = useShift();
  const { showSuccess, showError, showInfo } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [barcode, setBarcode] = useState('');
  const [qtyPcs, setQtyPcs] = useState(1);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [useManualBin, setUseManualBin] = useState(false);
  const [scanHistory, setScanHistory] = useState<StockEntryKT[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [failedEntry, setFailedEntry] = useState<StockEntryKT | null>(null);

  const resetForm = useCallback(() => {
    setStep(1);
    setBarcode('');
    setQtyPcs(1);
    setLocation('');
    setNotes('');
    setUseManualBin(false);
    setFailedEntry(null);
    setShowDuplicateWarning(false);
  }, []);

  const handleBarcodeScan = (raw: string) => {
    setBarcode(raw);
    setStep(2);
  };

  const handleLocationScan = (loc: string) => {
    setLocation(loc);
    handleSave(loc);
  };

  const handleSave = async (loc?: string, potentialDouble = false) => {
    const finalLocation = loc || location;
    if (!finalLocation) {
      showError('Lokasi wajib diisi.');
      return;
    }
    if (!barcode || !user || !shift) return;

    setIsSaving(true);

    try {
      if (!potentialDouble) {
        const checkRes = await fetch('/api/sheets/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            barcode,
            location: finalLocation,
            sheet: 'gudang-kecil-transit',
          }),
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.isDuplicate) {
            setLocation(finalLocation);
            setShowDuplicateWarning(true);
            setIsSaving(false);
            return;
          }
        }
      }

      await saveEntry(finalLocation, potentialDouble);
    } catch (e) {
      setIsSaving(false);
      showError('Gagal menyimpan data.');
    }
  };

  const saveEntry = async (finalLocation: string, potentialDouble: boolean) => {
    if (!barcode || !user || !shift) return;

    const entry: StockEntryKT = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: formatTimestamp(),
      date: formatDate(),
      user: user.name,
      shift,
      category: 'Gudang Transit',
      barcode,
      qtyPcs,
      location: finalLocation,
      notes,
      status: 'saved',
      potentialDouble,
    };

    try {
      const res = await fetch('/api/sheets/gudang-kecil-transit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (res.ok) {
        showSuccess('Data tersimpan', `${barcode} @ ${finalLocation}`);
        setScanHistory((prev) => [entry, ...prev]);
        resetForm();
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      if (!navigator.onLine) {
        const queueEntry = { ...entry, status: 'pending' as const };
        await addToQueue({
          type: 'gudang-kecil-transit',
          data: queueEntry,
          attempts: 0,
          createdAt: Date.now(),
        });
        showInfo('Mode Offline', 'Data disimpan ke antrean offline.');
        setScanHistory((prev) => [queueEntry, ...prev]);
        resetForm();
      } else {
        const failEntry = { ...entry, status: 'error' as const };
        setFailedEntry(failEntry);
        showError('Gagal simpan', 'Klik "Coba Simpan Ulang" atau batalkan.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = async () => {
    if (!failedEntry) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/sheets/gudang-kecil-transit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...failedEntry, status: 'saved' }),
      });
      if (res.ok) {
        showSuccess('Data berhasil disimpan ulang!');
        setScanHistory((prev) => [{ ...failedEntry, status: 'saved' }, ...prev]);
        setFailedEntry(null);
        resetForm();
      } else {
        throw new Error('Server error');
      }
    } catch {
      showError('Gagal simpan ulang. Coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck size={24} className="text-amber-600" />
            Stock Opname Gudang Transit
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Scan barcode produk, masukkan qty, lalu scan lokasi bin
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          {[
            { n: 1, label: 'Scan Barcode' },
            { n: 2, label: 'Input Qty' },
            { n: 3, label: 'Scan Lokasi' },
          ].map(({ n, label }, i, arr) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${step === n ? 'bg-amber-600 text-white' : step > n ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                <span>{n}</span>
                <span>{label}</span>
              </div>
              {i < arr.length - 1 && <div className="h-px w-4 bg-gray-300 dark:bg-gray-600" />}
            </div>
          ))}
        </div>

        {/* Failed entry retry banner */}
        {failedEntry && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Data gagal disimpan.</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">{failedEntry.barcode} @ {failedEntry.location}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={handleRetry} size="sm" loading={isSaving}>
                <RefreshCw size={14} />
                Coba Simpan Ulang
              </Button>
              <Button onClick={() => { setFailedEntry(null); resetForm(); }} size="sm" variant="ghost">Batalkan</Button>
            </div>
          </div>
        )}

        {/* Main form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
          <BarcodeInput
            label="Step 1: Scan Barcode Produk"
            placeholder="Scan barcode produk..."
            onScan={handleBarcodeScan}
            autoFocus={step === 1}
            disabled={step > 1 && !!barcode}
          />

          {barcode && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <span className="text-xs text-gray-500">Barcode:</span>
              <span className="font-mono text-sm font-semibold text-amber-700 dark:text-amber-400 flex-1">{barcode}</span>
              <button onClick={() => { setBarcode(''); setStep(1); }} className="text-xs text-gray-400 hover:text-red-500">Ganti</button>
            </div>
          )}

          {step >= 2 && barcode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Step 2: Qty (PCS)
              </label>
              <input
                type="number"
                min={1}
                value={qtyPcs}
                onChange={(e) => setQtyPcs(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xl font-semibold"
              />
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Catatan (opsional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm"
                />
              </div>
              <Button onClick={() => setStep(3)} className="w-full mt-3 bg-amber-600 hover:bg-amber-700">
                <MapPin size={16} />
                Lanjut Scan Lokasi
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Step 3: Lokasi</label>
                <button
                  type="button"
                  onClick={() => { setUseManualBin(!useManualBin); setLocation(''); }}
                  className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  {useManualBin ? <><ScanLine size={14} /> Scanner</> : <><Edit3 size={14} /> Manual</>}
                </button>
              </div>

              {!useManualBin ? (
                <BarcodeInput
                  label="Scan Barcode Lokasi Bin"
                  placeholder="Scan lokasi bin..."
                  onScan={handleLocationScan}
                  autoFocus
                  disabled={isSaving}
                />
              ) : (
                <>
                  <ManualBinSelect
                    value={location}
                    onChange={setLocation}
                    onConfirm={(loc) => handleSave(loc)}
                  />
                  {location && (
                    <Button
                      onClick={() => handleSave(location)}
                      loading={isSaving}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      Simpan Data
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {(step > 1 || barcode) && (
            <Button onClick={resetForm} variant="ghost" size="sm" className="w-full">
              <RotateCcw size={14} />
              Reset Semua
            </Button>
          )}
        </div>

        {/* Scan History */}
        <ScanHistoryTable entries={scanHistory} type="kt" />

        {/* Duplicate Warning */}
        <Modal
          isOpen={showDuplicateWarning}
          title="Potensi Data Double"
          onClose={() => setShowDuplicateWarning(false)}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <AlertTriangle className="text-orange-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-orange-800 dark:text-orange-300">
                Barcode <strong>{barcode}</strong> dengan lokasi <strong>{location}</strong> sudah pernah distock sebelumnya. Simpan ulang?
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDuplicateWarning(false)} className="flex-1">Batal</Button>
              <Button
                onClick={() => { setShowDuplicateWarning(false); setIsSaving(true); saveEntry(location, true); }}
                className="flex-1"
                variant="danger"
              >
                Simpan Ulang
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
