import React from 'react';

export const BapsdSection = ({ bapsdData }) => {
    return (
        bapsdData ? (
            <div style={{
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Berita Acara Pengalihan Sisa Dana (BAPSD)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Nomor Dokumen:</span> <strong>{bapsdData.nomorDokumen || '—'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Periode:</span> <strong>{bapsdData.periodeLabel}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Lembaga:</span> <strong>{bapsdData.namaLembaga}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Sisa Dana:</span> <strong style={{ color: 'var(--color-primary)' }}>Rp{Number(bapsdData.sisaDana || 0).toLocaleString('id-ID')}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Pejabat:</span> <strong>{bapsdData.namaPejabat}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Akuntan:</span> <strong>{bapsdData.namaAkuntan}</strong></div>
                </div>
            </div>
        ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Tekan "Tampilkan BAPSD" untuk memuat data.
            </div>
        )
    );
};
