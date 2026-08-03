import React from 'react';

export const ClosePeriodeModal = ({
    closingPeriode,
    showOverwritePrompt,
    closingLoading,
    onClose,
    onConfirm
}) => {
    if (!closingPeriode) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: 'var(--shadow-hover)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                    Konfirmasi Tutup Periode
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    Apakah Anda yakin ingin menutup periode <strong>{closingPeriode.tanggalMulai} s/d {closingPeriode.tanggalSelesai}</strong>?
                </p>

                <div style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    fontSize: '13px',
                    color: 'var(--text)'
                }}>
                    <strong>Otomatisasi Carry-over:</strong>
                    <ul style={{ margin: '6px 0 0 18px', padding: 0, lineHeight: '1.6' }}>
                        <li>Saldo akhir Kas/Bank (1101 &amp; 1102) akan menjadi Saldo Awal Periode berikutnya.</li>
                        <li>Saldo akhir Qty Barang Gudang akan menjadi Saldo Awal Barang Periode berikutnya.</li>
                        <li>Status periode ini akan diubah menjadi <strong style={{ color: '#28a745' }}>SELESAI</strong>.</li>
                    </ul>
                </div>

                {showOverwritePrompt && (
                    <div style={{
                        backgroundColor: 'rgba(255, 193, 7, 0.15)',
                        color: 'var(--text)',
                        border: '1px solid #ffc107',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        fontSize: '13px'
                    }}>
                        ⚠️ <strong>Peringatan:</strong> Saldo awal untuk periode target sudah ada di sistem. Konfirmasi di bawah ini untuk meng-overwrite saldo awal tersebut dengan nilai saldo akhir terbaru.
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button
                        type="button"
                        disabled={closingLoading}
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'transparent',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        Batal
                    </button>

                    {!showOverwritePrompt ? (
                        <button
                            type="button"
                            disabled={closingLoading}
                            onClick={() => onConfirm(closingPeriode.id, false)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                backgroundColor: '#dc3545',
                                color: '#ffffff',
                                fontWeight: 600,
                                cursor: closingLoading ? 'not-allowed' : 'pointer',
                                fontSize: '13px'
                            }}
                        >
                            {closingLoading ? 'Memproses...' : 'Tutup Periode & Carry Over'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={closingLoading}
                            onClick={() => onConfirm(closingPeriode.id, true)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                backgroundColor: '#fd7e14',
                                color: '#ffffff',
                                fontWeight: 600,
                                cursor: closingLoading ? 'not-allowed' : 'pointer',
                                fontSize: '13px'
                            }}
                        >
                            {closingLoading ? 'Memproses...' : 'Konfirmasi Overwrite'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
