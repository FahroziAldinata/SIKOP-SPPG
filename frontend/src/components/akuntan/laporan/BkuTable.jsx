import React from 'react';
import { Table } from '../../Table';

export const BkuTable = ({ reportData }) => {
    return (
        <Table
            columns={[
                { key: 'tanggal', header: 'Tanggal', align: 'center' },
                { key: 'noBukti', header: 'No Bukti', align: 'center' },
                { key: 'uraian', header: 'Uraian' },
                {
                    key: 'debet',
                    header: 'Debet',
                    align: 'center',
                    render: (v) => (
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                        </span>
                    )
                },
                {
                    key: 'kredit',
                    header: 'Kredit',
                    align: 'center',
                    render: (v) => (
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                        </span>
                    )
                },
                {
                    key: 'saldoBerjalan',
                    header: 'Saldo Berjalan',
                    align: 'center',
                    render: (v) => (
                        <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                            Rp{Number(v).toLocaleString('id-ID')}
                        </strong>
                    )
                }
            ]}
            data={reportData}
            emptyText="Tidak ada data untuk laporan terpilih pada periode ini."
        />
    );
};
