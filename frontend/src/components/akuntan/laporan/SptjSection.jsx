import React from 'react';

export const SptjSection = ({ sptjData }) => {
    return (
        sptjData ? (
            <div style={{
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Surat Pernyataan Tanggung Jawab (SPTJ)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Lembaga:</span> <strong>{sptjData.namaLembaga}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Pejabat:</span> <strong>{sptjData.namaPejabat} ({sptjData.jabatan})</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Jumlah Penerimaan:</span> <strong>Rp{Number(sptjData.jumlahPenerimaan || 0).toLocaleString('id-ID')}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Jumlah Pengeluaran:</span> <strong>Rp{Number(sptjData.jumlahPengeluaran || 0).toLocaleString('id-ID')}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Sisa Dana:</span> <strong style={{ color: 'var(--color-primary)' }}>Rp{Number(sptjData.sisaDana || 0).toLocaleString('id-ID')}</strong></div>
                </div>
            </div>
        ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Tekan "Tampilkan SPTJ" untuk memuat data.
            </div>
        )
    );
};
