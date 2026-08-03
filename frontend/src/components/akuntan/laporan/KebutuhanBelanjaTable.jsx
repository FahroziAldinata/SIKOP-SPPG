import React from 'react';
import { Table } from '../../ui/Table';

export const KebutuhanBelanjaTable = ({ belanjaData }) => {
    return (
        <>
            {belanjaData !== null && (
                <Table
                    columns={[
                        { key: 'nama', header: 'Nama Bahan Pokok' },
                        { key: 'satuan', header: 'Satuan' },
                        {
                            key: 'totalBeratKotorGr',
                            header: 'Berat Kotor (kg)',
                            align: 'center',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {(Number(v) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            )
                        },
                        {
                            key: 'totalBeratBersihGr',
                            header: 'Berat Bersih (kg)',
                            align: 'center',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {(Number(v) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            )
                        },
                        {
                            key: 'totalEstimasiBiaya',
                            header: 'Estimasi Biaya',
                            align: 'center',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        }
                    ]}
                    data={belanjaData}
                    emptyText="Tidak ada data kebutuhan belanja bahan untuk periode dan tanggal terpilih."
                />
            )}
            {belanjaData === null && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Silakan tentukan rentang tanggal dan klik "Tampilkan Laporan".
                </p>
            )}
        </>
    );
};
