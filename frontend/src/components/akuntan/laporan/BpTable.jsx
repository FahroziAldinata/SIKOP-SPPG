import React from 'react';
import { Table } from '../../ui/Table';

export const BpTable = ({ bpData, jenisLaporan }) => {
    return (
        bpData ? (
            <div>
                {/* Summary header */}
                <div style={{
                    display: 'flex', gap: '24px', flexWrap: 'wrap',
                    marginBottom: '16px', padding: '16px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', fontSize: '14px'
                }}>
                    <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Akun:</span> {bpData.namaAkun}</div>
                    <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Awal:</span> Rp{Number(bpData.saldoAwal).toLocaleString('id-ID')}</div>
                    <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Akhir:</span> <strong>Rp{Number(bpData.saldoAkhir).toLocaleString('id-ID')}</strong></div>
                </div>
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
                                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-success)' }}>
                                    {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                                </span>
                            )
                        },
                        {
                            key: 'kredit',
                            header: 'Kredit',
                            align: 'center',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-danger)' }}>
                                    {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                                </span>
                            )
                        },
                        {
                            key: 'saldoBerjalan',
                            header: 'Saldo',
                            align: 'center',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        },
                        ...(jenisLaporan !== 'BP_KAS' ? [{
                            key: 'sumberKas',
                            header: 'Keterangan',
                            align: 'center',
                            render: (v) => <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{v || '—'}</span>
                        }] : [])
                    ]}
                    data={bpData.data || []}
                    emptyText="Tidak ada transaksi pada buku pembantu ini."
                />
            </div>
        ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Tidak ada data. Pastikan setup lembaga dan akun sudah terkonfigurasi.
            </div>
        )
    );
};
