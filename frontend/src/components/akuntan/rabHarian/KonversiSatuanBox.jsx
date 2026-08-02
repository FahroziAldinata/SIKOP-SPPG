import React from 'react';

export const KonversiSatuanBox = ({ tanggalInput, kebutuhanHitungan }) => {
    if (!tanggalInput || kebutuhanHitungan.length === 0) return null;

    return (
        <div style={{
            border: '1px solid var(--color-primary-light)',
            backgroundColor: 'rgba(181, 224, 234, 0.15)',
            padding: '16px', borderRadius: 'var(--radius-sm)',
            marginBottom: '20px', maxWidth: '640px'
        }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>
                📌 Referensi Konversi Satuan (Hitungan &rarr; KG)
            </h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {kebutuhanHitungan.map((item) => (
                    <div key={item.bahanPokokId} style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)', padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text)'
                    }}>
                        <strong>{item.nama}</strong>: {item.permintaanAG.toLocaleString('id-ID')} {item.satuanHitungan} &rarr; <strong>{item.final}</strong> KG{' '}
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(konversi {item.konversiPerKg}/kg)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
