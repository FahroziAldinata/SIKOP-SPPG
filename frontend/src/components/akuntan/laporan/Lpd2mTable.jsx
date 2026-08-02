import React from 'react';
import { Table } from '../../Table';

export const Lpd2mTable = ({ lpd2mData }) => {
    return (
        <>
            {lpd2mData && (
                <Table
                    columns={[
                        { key: 'periodeLabel', header: 'Periode' },
                        {
                            key: 'saldoAwal', header: 'Saldo Awal', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(v).toLocaleString('id-ID')}</span>
                        },
                        {
                            key: 'penerimaan', header: 'Penerimaan', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-success)' }}>Rp{Number(v).toLocaleString('id-ID')}</span>
                        },
                        {
                            key: 'pengeluaran', header: 'Pengeluaran', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-danger)' }}>Rp{Number(v).toLocaleString('id-ID')}</span>
                        },
                        {
                            key: 'saldoAkhir', header: 'Saldo Akhir', align: 'center',
                            render: (v) => <strong style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(v).toLocaleString('id-ID')}</strong>
                        },
                        {
                            key: 'totalRAB', header: 'Pagu (RAB)', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(v).toLocaleString('id-ID')}</span>
                        },
                        {
                            key: 'totalRealisasi', header: 'Realisasi', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(v).toLocaleString('id-ID')}</span>
                        },
                        {
                            key: 'persenPenyerapan', header: '% Penyerapan', align: 'center',
                            render: (v) => (
                                <strong style={{
                                    fontVariantNumeric: 'tabular-nums',
                                    color: v >= 90 ? 'var(--color-success)' : v >= 60 ? '#d97706' : 'var(--color-danger)'
                                }}>
                                    {Number(v).toFixed(1)}%
                                </strong>
                            )
                        }
                    ]}
                    data={lpd2mData.periodeData || []}
                    emptyText="Tidak ada data perkembangan dana untuk periode terpilih."
                />
            )}
            {lpd2mData?.pendingTransfer && (
                <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '6px', fontSize: '13px', color: '#8c6b00' }}>
                    ⚠️ <strong>Catatan:</strong> Realisasi penerimaan dana belum tercatat masuk di jurnal transaksi (pending transfer).
                </div>
            )}
            {!lpd2mData && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Pilih periode di atas dan klik "Tampilkan LPD2M".
                </p>
            )}
        </>
    );
};
