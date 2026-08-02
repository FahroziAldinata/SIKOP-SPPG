import React from 'react';
import { Skeleton } from '../../Skeleton';
import { Table, renderDate, renderStatus, renderCurrency } from '../../Table';
import { ConfirmDialog } from '../../ConfirmDialog';

export const RabHarianList = ({
    loading,
    rabList,
    verifyRab,
    triggerAjukan,
    confirmOpen,
    pendingRabId,
    handleAjukan,
    setConfirmOpen,
    setPendingRabId
}) => {
    return (
        <>
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar RAB Harian</h3>
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="40px" />)}
                </div>
            )}
            {!loading && <Table
                scrollHeight="540px"
                columns={[
                    { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                    { key: 'status', header: 'Status', render: (v) => renderStatus(v) },
                    {
                        key: 'totalKebutuhan', header: 'Total Kebutuhan', align: 'right',
                        render: (v) => v ? <span>Rp {renderCurrency(v, false)}</span> : '—'
                    },
                    {
                        key: 'totalPagu', header: 'Pagu', align: 'right',
                        render: (v) => v ? <span>Rp {renderCurrency(v, false)}</span> : '—'
                    },
                    {
                        key: 'selisih', header: 'Sisa', align: 'right',
                        render: (v) => {
                            if (v === null || v === undefined) return '—';
                            const isNeg = Number(v) < 0;
                            return <span style={{ fontWeight: 700, color: isNeg ? 'var(--color-danger, #ef4444)' : 'var(--text)' }}>Rp {renderCurrency(v, false)}</span>;
                        }
                    },
                    { key: 'createdBy', header: 'Dibuat Oleh', render: (v) => v?.nama || v?.username || '—' },
                    {
                        key: 'items', header: 'Item', align: 'right',
                        render: (v) => `${(v || []).length} bahan`
                    },
                    {
                        key: 'aksi', header: 'Aksi',
                        render: (_, row) => {
                            if (row.status === 'DRAFT' || row.status === 'DITOLAK') {
                                const isVerified = Boolean(row.verifiedAt);
                                return (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        {!isVerified && row.items?.length > 0 && (
                                            <button onClick={() => verifyRab(row.id)} style={{
                                                padding: '5px 10px', backgroundColor: '#22c55e',
                                                color: '#fff', border: 'none',
                                                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                                fontWeight: 600, fontSize: '11px'
                                            }}>
                                                Verifikasi
                                            </button>
                                        )}
                                        {isVerified ? (
                                            <button onClick={() => triggerAjukan(row.id)} style={{
                                                padding: '5px 12px', backgroundColor: 'var(--btn-primary-bg)',
                                                color: 'var(--btn-primary-text)', border: 'none',
                                                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                                fontWeight: 600, fontSize: '12px'
                                            }}>
                                                Ajukan
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                Verifikasi dulu sebelum mengajukan
                                            </span>
                                        )}
                                    </div>
                                );
                            }
                            return '—';
                        }
                    }
                ]}
                data={rabList}
                emptyText="Belum ada data RAB Harian untuk periode ini."
            />}
            <ConfirmDialog
                open={confirmOpen}
                title="Konfirmasi Pengajuan"
                message="Ajukan RAB Harian ini ke Kepala SPPG untuk persetujuan?"
                onConfirm={handleAjukan}
                onCancel={() => { setConfirmOpen(false); setPendingRabId(null); }}
            />
        </>
    );
};
