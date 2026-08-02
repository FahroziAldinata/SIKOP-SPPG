import React from 'react';
import { Skeleton } from '../../Skeleton';
import { Table, renderDate, renderCurrency } from '../../Table';

export const RabP12RekapSection = ({
    loadingP12,
    rabP12Rekap,
    previewRabP12Pdf,
    pdfLoading,
    tanggalInput
}) => {
    return (
        <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            marginTop: '20px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: 'var(--text)' }}>
                    📊 Rekap Pagu &amp; Pemakaian Periode
                </h3>
                <button
                    onClick={() => previewRabP12Pdf()}
                    disabled={pdfLoading || !tanggalInput}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        opacity: (pdfLoading || !tanggalInput) ? 0.6 : 1
                    }}
                >
                    {pdfLoading ? 'Memuat PDF...' : '📄 Preview PDF'}
                </button>
            </div>

            {/* Tabel rekap periode */}
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>
                Rekap Pagu &amp; Pemakaian Periode
            </h4>
            {loadingP12 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} height="40px" />)}
                </div>
            )}
            {!loadingP12 && (
                <Table
                    scrollHeight="540px"
                    columns={[
                        { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                        {
                            key: 'porsi',
                            header: 'Porsi',
                            render: (v) => `K:${v?.KECIL ?? 0} B:${v?.BESAR ?? 0}`
                        },
                        {
                            key: 'maksimalAnggaran',
                            header: 'Maksimal Anggaran',
                            align: 'right',
                            render: (v) => <span>Rp {renderCurrency(v, false)}</span>
                        },
                        {
                            key: 'jumlahKebutuhanBahan',
                            header: 'Kebutuhan Bahan',
                            align: 'right',
                            render: (v) => <span>Rp {renderCurrency(v, false)}</span>
                        },
                        {
                            key: 'pemakaianAnggaran',
                            header: 'Pemakaian',
                            align: 'right',
                            render: (v) => <span>Rp {renderCurrency(v, false)}</span>
                        },
                        {
                            key: 'sisa',
                            header: 'Sisa',
                            align: 'right',
                            render: (v) => {
                                const isNeg = Number(v) < 0;
                                return (
                                    <span style={{
                                        fontWeight: 700,
                                        color: isNeg ? 'var(--color-danger, #ef4444)' : 'var(--text)'
                                    }}>
                                        Rp {renderCurrency(v, false)}
                                    </span>
                                );
                            }
                        },
                        {
                            key: 'aksi',
                            header: 'Aksi',
                            align: 'center',
                            render: (_, row) => (
                                <button
                                    onClick={() => previewRabP12Pdf(row.tanggal)}
                                    disabled={pdfLoading}
                                    style={{
                                        padding: '4px 10px',
                                        backgroundColor: 'var(--btn-primary-bg)',
                                        color: 'var(--btn-primary-text)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    📄 Preview PDF
                                </button>
                            )
                        }
                    ]}
                    data={rabP12Rekap}
                    emptyText="Belum ada data rekap untuk periode ini."
                />
            )}
        </div>
    );
};
