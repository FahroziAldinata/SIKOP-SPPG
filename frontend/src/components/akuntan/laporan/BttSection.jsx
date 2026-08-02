import React from 'react';

export const BttSection = ({ bttData }) => {
    return (
        <>
            {bttData && (
                <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <h4>BUKTI TANDA TERIMA</h4>
                    <p>Nomor: {bttData.nomorDokumen}</p>
                    <p>Nominal: Rp {Number(bttData.nominal).toLocaleString('id-ID')}</p>
                    <p>Terbilang: {bttData.terbilang}</p>
                    <p>Keperluan: {bttData.keperluan}</p>
                    <p>Penerima: {bttData.mitraNama}</p>
                </div>
            )}
            {!bttData && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Klik "Tampilkan Data BTT" untuk memuat data.
                </p>
            )}
        </>
    );
};
