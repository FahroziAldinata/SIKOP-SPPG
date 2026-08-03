import React from 'react';
import { Skeleton } from '../../ui/Skeleton';
import { Table, renderDate } from '../../ui/Table';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

export const AnggaranList = ({
    anggaranLoading,
    anggaranList,
    setAnggaranEditTarget,
    deleteConfirmId,
    setDeleteConfirmId,
    deleteAnggaranHarian
}) => {
    return (
        <>
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Anggaran Harian</h3>
            {anggaranLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="40px" />)}
                </div>
            )}
            {!anggaranLoading && <>
                <Table
                    columns={[
                        { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                        { key: 'kategoriDana', header: 'Kategori Dana' },
                        {
                            key: 'keterangan', header: 'Keterangan',
                            render: (v) => v || <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                        },
                        { key: 'rab', header: 'Anggaran (RAB)', align: 'right', render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>Rp{Number(v).toLocaleString('id-ID')}</span> },
                        { key: 'aktual', header: 'Realisasi (Aktual)', align: 'right', render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>Rp{Number(v).toLocaleString('id-ID')}</span> },
                        { key: 'selisih', header: 'Selisih', align: 'right', render: (v) => <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>Rp{Number(v).toLocaleString('id-ID')}</strong> },
                        {
                            key: 'aksi', header: 'Aksi', align: 'center',
                            render: (_v, row) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => setAnggaranEditTarget({
                                            id: row.id,
                                            tanggal: row.tanggal,
                                            kategoriDana: row.kategoriDana,
                                            totalAnggaran: row.rab,
                                            keterangan: row.keterangan || ''
                                        })}
                                        style={{
                                            padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                                            border: '1px solid var(--color-warning, #f59e0b)',
                                            borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent',
                                            color: 'var(--color-warning, #f59e0b)', cursor: 'pointer'
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmId(row.id)}
                                        style={{
                                            padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                                            border: '1px solid var(--color-danger, #ef4444)',
                                            borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent',
                                            color: 'var(--color-danger, #ef4444)', cursor: 'pointer'
                                        }}
                                    >
                                        Hapus
                                    </button>
                                </div>
                            )
                        }
                    ]}
                    data={anggaranList}
                    emptyText="Belum ada data Anggaran Harian untuk periode ini."
                />
                <ConfirmDialog
                    isOpen={deleteConfirmId !== null}
                    title="Hapus Anggaran Harian?"
                    message="Data yang dihapus tidak dapat dikembalikan."
                    confirmLabel="Hapus"
                    confirmStyle="danger"
                    onConfirm={() => {
                        if (deleteConfirmId) {
                            deleteAnggaranHarian(deleteConfirmId);
                            setDeleteConfirmId(null);
                        }
                    }}
                    onCancel={() => setDeleteConfirmId(null)}
                />
            </>}
        </>
    );
};
