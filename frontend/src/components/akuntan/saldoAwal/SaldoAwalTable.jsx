import React from 'react';
import { Table } from '../../Table';
import { Skeleton } from '../../Skeleton';

export const SaldoAwalTable = ({
    loading = false,
    saldoAwalList = [],
    onEdit,
    onDelete
}) => {
    return (
        <div>
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Saldo Awal Barang Terdaftar</h3>
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}
            {!loading && <Table
                columns={[
                    { key: 'bahanPokok', header: 'Nama Bahan Pokok', render: (v) => v ? v.nama : '—' },
                    { key: 'bahanPokokSatuan', header: 'Satuan', align: 'center', width: '100px', render: (_, row) => row.bahanPokok ? row.bahanPokok.satuan : '—' },
                    {
                        key: 'saldoAwalQty',
                        header: 'Saldo Awal (Qty)',
                        align: 'right',
                        render: (v) => (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                {Number(v).toLocaleString('id-ID')}
                            </span>
                        )
                    },
                    {
                        key: 'hargaBeliAwal',
                        header: 'Harga Beli Awal',
                        align: 'right',
                        render: (v) => (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                Rp{Number(v).toLocaleString('id-ID')}
                            </span>
                        )
                    },
                    {
                        key: 'id',
                        header: 'Total Nilai Saldo Awal',
                        align: 'right',
                        render: (_, row) => {
                            const totalNilai = Number(row.saldoAwalQty) * Number(row.hargaBeliAwal);
                            return (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{totalNilai.toLocaleString('id-ID')}
                                </strong>
                            );
                        }
                    },
                    {
                        key: 'aksi',
                        header: 'Aksi',
                        align: 'center',
                        width: '140px',
                        render: (_, row) => (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => onEdit(row)}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg)',
                                        color: 'var(--text)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(row)}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        color: 'var(--color-danger)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Hapus
                                </button>
                            </div>
                        )
                    }
                ]}
                data={saldoAwalList}
                emptyText="Belum ada data saldo awal barang untuk periode ini."
            />}
        </div>
    );
};
