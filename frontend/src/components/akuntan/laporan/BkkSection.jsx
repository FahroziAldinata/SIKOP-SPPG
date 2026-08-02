import React from 'react';
import { Table } from '../../Table';

export const BkkSection = ({ bkkData }) => {
    return (
        bkkData ? (
            <div>
                {/* Summary card */}
                <div style={{
                    padding: '16px 24px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '32px',
                    flexWrap: 'wrap',
                    fontSize: '14px'
                }}>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Periode:</span>{' '}
                        {bkkData.periodeLabel}
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Lembaga:</span>{' '}
                        {bkkData.lembaga?.namaLembaga || '—'}
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Awal:</span>{' '}
                        <strong>Rp{Number(bkkData.saldoAwal || 0).toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Penerimaan:</span>{' '}
                        <strong style={{ color: '#15803d' }}>Rp{Number(bkkData.totalPenerimaan || 0).toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Pengeluaran:</span>{' '}
                        <strong style={{ color: '#dc2626' }}>Rp{Number(bkkData.totalPengeluaran || 0).toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Akhir:</span>{' '}
                        <strong style={{ color: 'var(--color-primary)' }}>Rp{Number(bkkData.saldoAkhir || 0).toLocaleString('id-ID')}</strong>
                    </div>
                </div>

                {/* BKK Table */}
                <Table
                    columns={[
                        { key: 'no', header: 'No', align: 'center', render: (_, __, idx) => idx + 1 },
                        {
                            key: 'tanggal',
                            header: 'Tanggal',
                            align: 'center',
                            render: (v) => {
                                try { return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); }
                                catch { return v; }
                            }
                        },
                        { key: 'noBukti', header: 'No. Bukti', align: 'center' },
                        { key: 'uraian', header: 'Uraian' },
                        {
                            key: 'jenisPengeluaran',
                            header: 'Jenis Pengeluaran',
                            align: 'center',
                            render: (v) => (
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: v === 'Pengisian Kas' ? '#dcfce7' :
                                        v === 'Transport' ? '#dbeafe' :
                                        v === 'ATK' ? '#fef9c3' :
                                        v === 'Konsumsi' ? '#fce7f3' :
                                        v === 'Pemeliharaan' ? '#ffedd5' :
                                        '#e8edf5',
                                    color: v === 'Pengisian Kas' ? '#15803d' :
                                        v === 'Transport' ? '#1d4ed8' :
                                        v === 'ATK' ? '#854d0e' :
                                        v === 'Konsumsi' ? '#9d174d' :
                                        v === 'Pemeliharaan' ? '#c2410c' :
                                        '#1e3a5f'
                                }}>
                                    {v}
                                </span>
                            )
                        },
                        {
                            key: 'penerimaan',
                            header: 'Penerimaan',
                            align: 'right',
                            render: (v) => Number(v) > 0
                                ? <strong style={{ color: '#15803d' }}>Rp{Number(v).toLocaleString('id-ID')}</strong>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        },
                        {
                            key: 'pengeluaran',
                            header: 'Pengeluaran',
                            align: 'right',
                            render: (v) => Number(v) > 0
                                ? <strong style={{ color: '#dc2626' }}>Rp{Number(v).toLocaleString('id-ID')}</strong>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        },
                        {
                            key: 'saldo',
                            header: 'Saldo',
                            align: 'right',
                            render: (v) => <strong>Rp{Number(v).toLocaleString('id-ID')}</strong>
                        }
                    ]}
                    data={bkkData.rows}
                    emptyText="Tidak ada transaksi kas kecil pada periode ini."
                />

                {/* Grand Total */}
                {bkkData.rows && bkkData.rows.length > 0 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '24px',
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 700,
                        backgroundColor: '#1e3a5f',
                        color: '#fff',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '8px',
                        flexWrap: 'wrap'
                    }}>
                        <span>Total Penerimaan: Rp{Number(bkkData.totalPenerimaan || 0).toLocaleString('id-ID')}</span>
                        <span>Total Pengeluaran: Rp{Number(bkkData.totalPengeluaran || 0).toLocaleString('id-ID')}</span>
                        <span>Saldo Akhir: Rp{Number(bkkData.saldoAkhir || 0).toLocaleString('id-ID')}</span>
                    </div>
                )}
            </div>
        ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Tekan &quot;Tampilkan BKK&quot; untuk memuat data.
            </div>
        )
    );
};
