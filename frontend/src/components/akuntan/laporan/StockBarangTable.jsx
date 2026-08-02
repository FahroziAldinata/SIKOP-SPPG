import React from 'react';
import { Table } from '../../Table';

export const StockBarangTable = ({ stockData }) => {
    return (
        <Table
            columns={[
                { key: 'nama', header: 'Nama Bahan' },
                { key: 'satuan', header: 'Satuan' },
                {
                    key: 'saldoAwalQty',
                    header: 'Saldo Awal',
                    align: 'center',
                    render: (v) => (
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {Number(v).toLocaleString('id-ID')}
                        </span>
                    )
                },
                {
                    key: 'totalMasukQty',
                    header: 'Total Masuk',
                    align: 'center',
                    render: (v) => (
                        <span style={{ color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                            {Number(v).toLocaleString('id-ID')}
                        </span>
                    )
                },
                {
                    key: 'totalKeluarQty',
                    header: 'Total Keluar',
                    align: 'center',
                    render: (v) => (
                        <span style={{ color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                            {Number(v).toLocaleString('id-ID')}
                        </span>
                    )
                },
                {
                    key: 'saldoAkhirQty',
                    header: 'Saldo Akhir',
                    align: 'center',
                    render: (v) => (
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                            {Number(v).toLocaleString('id-ID')}
                        </span>
                    )
                },
                {
                    key: 'hargaBeliTerakhir',
                    header: 'Harga Beli Terakhir',
                    align: 'center',
                    render: (v) => (
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            Rp{Number(v).toLocaleString('id-ID')}
                        </span>
                    )
                },
                {
                    key: 'nilaiStock',
                    header: 'Nilai Stock',
                    align: 'center',
                    render: (v) => (
                        <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                            Rp{Number(v).toLocaleString('id-ID')}
                        </strong>
                    )
                }
            ]}
            data={stockData}
            emptyText="Tidak ada data stock barang untuk periode dan tanggal terpilih."
        />
    );
};
