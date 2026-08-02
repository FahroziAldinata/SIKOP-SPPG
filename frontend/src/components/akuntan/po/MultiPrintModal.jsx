import React from 'react';
import { cleanDateStr, getDatesInRange } from './statusStyles';

export const MultiPrintModal = ({
    isMultiPrintModalOpen,
    selectedTanggalMulti,
    setSelectedTanggalMulti,
    nomorDokumenGabungan,
    setNomorDokumenGabungan,
    periods,
    selectedPeriodId,
    renderDate,
    request,
    toast,
    setPrintGabunganData,
    setIsPrinting,
    setIsMultiPrintModalOpen,
}) => {
    if (!isMultiPrintModalOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                width: '100%',
                maxWidth: '500px',
                padding: '24px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-hover)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Cetak PO Gabungan Multi-Tanggal</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)' }}>Nomor Dokumen PO</label>
                    <input
                        type="text"
                        placeholder="Masukkan nomor dokumen (opsional)"
                        value={nomorDokumenGabungan}
                        onChange={(e) => setNomorDokumenGabungan(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '13px',
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                    Pilih tanggal-tanggal yang ingin digabungkan dalam cetakan PO:
                </p>
                
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(() => {
                        const activePeriod = periods.find(p => p.id === selectedPeriodId);
                        if (!activePeriod) return <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pilih periode terlebih dahulu.</span>;
                        const dates = getDatesInRange(cleanDateStr(activePeriod.tanggalMulai), cleanDateStr(activePeriod.tanggalSelesai));
                        return dates.map(tgl => {
                            const isChecked = selectedTanggalMulti.includes(tgl);
                            return (
                                <label key={tgl} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', color: 'var(--text)' }}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                            if (isChecked) {
                                                setSelectedTanggalMulti(prev => prev.filter(t => t !== tgl));
                                            } else {
                                                setSelectedTanggalMulti(prev => [...prev, tgl]);
                                            }
                                        }}
                                    />
                                    {renderDate(tgl)}
                                </label>
                            );
                        });
                    })()}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button
                        type="button"
                        onClick={() => {
                            setIsMultiPrintModalOpen(false);
                            setSelectedTanggalMulti([]);
                            setNomorDokumenGabungan('');
                        }}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--border)',
                            color: 'var(--text)',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600
                        }}
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        disabled={selectedTanggalMulti.length === 0}
                        onClick={async () => {
                            try {
                                const r = await request(`/mitra/po/kebutuhan?tanggal=${selectedTanggalMulti.join(',')}&periodeId=${selectedPeriodId}`);
                                if (r.ok) {
                                    const data = await r.json();
                                    setPrintGabunganData(data);
                                    setIsPrinting(true);
                                    setIsMultiPrintModalOpen(false);
                                } else {
                                    const errData = await r.json().catch(() => ({ error: 'Gagal memuat kebutuhan bahan gabungan.' }));
                                    toast.error(errData.error);
                                }
                            } catch (err) {
                                toast.error('Koneksi server gagal.');
                            }
                        }}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--btn-primary-bg)',
                            color: 'var(--btn-primary-text)',
                            border: 'none',
                            cursor: selectedTanggalMulti.length === 0 ? 'not-allowed' : 'pointer',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                            opacity: selectedTanggalMulti.length === 0 ? 0.6 : 1
                        }}
                    >
                        Cetak
                    </button>
                </div>
            </div>
        </div>
    );
};
