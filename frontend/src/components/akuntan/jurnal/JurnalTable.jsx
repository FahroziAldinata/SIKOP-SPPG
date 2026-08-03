import React from 'react';
import { Table, renderDate, renderCode, renderTruncate, renderStatus } from '../../ui/Table';
import { Skeleton } from '../../ui/Skeleton';

export const JurnalTable = ({
    loading,
    jurnalList = [],
    handleStartEdit,
    handleDelete,
    pagination,
    setPage,
    loadJurnal,
    periodeId
}) => {
    return (
        <>
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Jurnal Transaksi</h3>
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}
            {!loading && (
                <>
                    <Table
                        columns={[
                            { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                            { key: 'nomorBukti', header: 'Nomor Bukti', render: (v) => renderCode(v) },
                            { key: 'uraian', header: 'Uraian', render: (v) => renderTruncate(v) },
                            { key: 'jenis', header: 'Jenis', render: (v) => renderStatus(v) },
                            {
                                key: 'nominal',
                                header: 'Nominal',
                                align: 'right',
                                render: (v) => (
                                    <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                        Rp{Number(v).toLocaleString('id-ID')}
                                    </strong>
                                )
                            },
                            { key: 'akunKas', header: 'Akun Kas', render: (v) => v ? `[${v.kode}] ${v.nama}` : '—' },
                            { key: 'akunDanaBiaya', header: 'Akun Dana / Biaya', render: (v) => v ? `[${v.kode}] ${v.nama}` : '—' },
                            {
                                key: 'id',
                                header: 'Aksi',
                                align: 'center',
                                width: '140px',
                                render: (_, row) => (
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleStartEdit(row)}
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
                                            onClick={() => handleDelete(row.id)}
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
                        data={jurnalList}
                        emptyText="Belum ada data Jurnal Transaksi untuk periode ini."
                    />

                    {/* Pagination Controls */}
                    {pagination.totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '15px',
                            padding: '12px 16px',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                Halaman <strong>{pagination.page}</strong> dari <strong>{pagination.totalPages}</strong> (Total <strong>{pagination.total}</strong> transaksi)
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    disabled={pagination.page <= 1}
                                    onClick={() => {
                                        const newPage = pagination.page - 1;
                                        setPage(newPage);
                                        loadJurnal(periodeId, newPage);
                                    }}
                                    style={{
                                        padding: '6px 14px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg)',
                                        color: 'var(--text)',
                                        cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                                        opacity: pagination.page <= 1 ? 0.5 : 1
                                    }}
                                >
                                    &laquo; Sebelum
                                </button>
                                <button
                                    type="button"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => {
                                        const newPage = pagination.page + 1;
                                        setPage(newPage);
                                        loadJurnal(periodeId, newPage);
                                    }}
                                    style={{
                                        padding: '6px 14px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg)',
                                        color: 'var(--text)',
                                        cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                                        opacity: pagination.page >= pagination.totalPages ? 0.5 : 1
                                    }}
                                >
                                    Berikut &raquo;
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default JurnalTable;
