import React from 'react';
import { StatusBadge } from '../../ui/StatusBadge';

export const PeriodeListCard = ({ periodeList = [], user, onRequestClose }) => {
    return (
        <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            marginBottom: '24px'
        }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                Daftar Periode Operasional &amp; Status
            </h3>
            {periodeList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Belum ada periode yang terdaftar.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Rentang Tanggal</th>
                                <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Pagu Alokasi</th>
                                <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Status</th>
                                <th style={{ padding: '10px 12px', color: 'var(--text-muted)', textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periodeList.map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text)' }}>
                                        {p.tanggalMulai} s/d {p.tanggalSelesai}
                                    </td>
                                    <td style={{ padding: '12px', color: 'var(--text)' }}>
                                        Rp {Number(p.anggaranAlokasi || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <StatusBadge status={p.status} />
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                        {user?.role === 'AKUNTAN' && p.status !== 'SELESAI' && (
                                            <button
                                                type="button"
                                                onClick={() => onRequestClose(p)}
                                                style={{
                                                    padding: '6px 14px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    backgroundColor: '#dc3545',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-sm)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Tutup Periode
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
