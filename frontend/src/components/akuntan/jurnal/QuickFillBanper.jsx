import React from 'react';

export const QuickFillBanper = ({ jurnalForm, setJurnalForm, activePeriod, akunList = [] }) => {
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginRight: '4px' }}>
                Isi Cepat BanPer:
            </span>
            {[
                { label: 'Bahan Baku', uraian: 'Diterima Dana BanPer untuk Bahan Baku', kategori: 'BAHAN_MAKANAN' },
                { label: 'Operasional', uraian: 'Diterima Dana BanPer untuk Operasional', kategori: 'OPERASIONAL' },
                { label: 'Insentif Fasilitas', uraian: 'Diterima Dana BanPer untuk Insentif Fasilitas', kategori: 'INSENTIF_FASILITAS' },
            ].map(({ label, uraian, kategori }) => {
                const akunDana = akunList.find(a => a.tipe === 'DANA' && a.kategoriDana === kategori) || akunList.find(a => a.tipe === 'BIAYA' && a.kategoriDana === kategori);
                return (
                    <button
                        key={kategori}
                        type="button"
                        disabled={!akunDana}
                        title={akunDana ? `Auto-isi: ${uraian} → Akun [${akunDana?.kode}]` : 'Akun Dana untuk kategori ini tidak ditemukan'}
                        onClick={() => setJurnalForm(prev => ({
                            ...prev,
                            uraian,
                            jenis: 'MASUK',
                            akunDanaBiayaId: akunDana?.id || prev.akunDanaBiayaId
                        }))}
                        style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: '1px solid var(--color-primary, #4f46e5)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'transparent',
                            color: 'var(--color-primary, #4f46e5)',
                            cursor: akunDana ? 'pointer' : 'not-allowed',
                            opacity: akunDana ? 1 : 0.45,
                        }}
                    >
                        + {label}
                    </button>
                );
            })}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>(masih bisa edit manual)</span>
        </div>
    );
};

export default QuickFillBanper;
