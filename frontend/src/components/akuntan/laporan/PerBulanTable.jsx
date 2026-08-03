import React from 'react';
import { Table } from '../../ui/Table';

export const PerBulanTable = ({ perBulanData, formatIndoMonth }) => {
    return (
        <>
            {perBulanData !== null && (
                <Table
                    columns={[
                        {
                            key: 'month',
                            header: 'Bulan',
                            render: (_, row) => formatIndoMonth(row.year, row.month)
                        },
                        {
                            key: 'totalMasuk',
                            header: 'Total Masuk',
                            align: 'center',
                            render: (v) => (
                                <span style={{ color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </span>
                            )
                        },
                        {
                            key: 'totalKeluar',
                            header: 'Total Keluar',
                            align: 'center',
                            render: (v) => (
                                <span style={{ color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </span>
                            )
                        },
                        {
                            key: 'key',
                            header: 'Saldo Bersih',
                            align: 'center',
                            render: (_, row) => {
                                const saldoBersih = row.totalMasuk - row.totalKeluar;
                                return (
                                    <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                        Rp{saldoBersih.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </strong>
                                );
                            }
                        }
                    ]}
                    data={perBulanData}
                    emptyText="Tidak ada data kas bulanan untuk periode terpilih."
                />
            )}
            {perBulanData === null && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Silakan klik tombol "Tampilkan Laporan" untuk memuat data.
                </p>
            )}
        </>
    );
};
