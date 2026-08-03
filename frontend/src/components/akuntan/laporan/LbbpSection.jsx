import React from 'react';
import { Table } from '../../ui/Table';

export const LbbpSection = ({ lbbpData }) => {
    return (
        lbbpData ? (
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
                        {lbbpData.periodeLabel}
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Lembaga:</span>{' '}
                        {lbbpData.lembaga?.namaLembaga || '—'}
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Belanja:</span>{' '}
                        <strong style={{ color: 'var(--color-primary)' }}>
                            Rp{Number(lbbpData.grandTotal || 0).toLocaleString('id-ID')}
                        </strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Jumlah PO Terealisasi:</span>{' '}
                        {lbbpData.grupTanggal?.reduce((s, g) => s + g.rows.length, 0) || 0} item
                    </div>
                </div>

                {/* Table per tanggal */}
                {lbbpData.grupTanggal && lbbpData.grupTanggal.length > 0 ? (
                    lbbpData.grupTanggal.map((grup, gi) => {
                        const subtotalGrup = grup.rows.reduce((s, r) => s + Number(r.subtotal || 0), 0);
                        const tglFormatted = (() => {
                            try {
                                return new Date(grup.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
                            } catch { return grup.tanggal; }
                        })();
                        return (
                            <div key={gi} style={{ marginBottom: '24px' }}>
                                <div style={{
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    color: 'var(--text)',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                                    borderBottom: 'none'
                                }}>
                                    📅 {tglFormatted}
                                </div>
                                <Table
                                    columns={[
                                        { key: 'no', header: 'No', align: 'center', render: (_, __, idx) => idx + 1 },
                                        { key: 'noPO', header: 'No. PO', align: 'center' },
                                        { key: 'supplier', header: 'Supplier' },
                                        { key: 'namaBahan', header: 'Nama Bahan' },
                                        { key: 'satuan', header: 'Satuan', align: 'center' },
                                        {
                                            key: 'qty',
                                            header: 'Qty',
                                            align: 'right',
                                            render: (v) => Number(v).toLocaleString('id-ID', { maximumFractionDigits: 3 })
                                        },
                                        {
                                            key: 'hargaSatuan',
                                            header: 'Harga Satuan',
                                            align: 'right',
                                            render: (v) => `Rp${Number(v).toLocaleString('id-ID')}`
                                        },
                                        {
                                            key: 'subtotal',
                                            header: 'Subtotal',
                                            align: 'right',
                                            render: (v) => <strong>Rp{Number(v).toLocaleString('id-ID')}</strong>
                                        },
                                        {
                                            key: 'status',
                                            header: 'Status',
                                            align: 'center',
                                            render: (v) => (
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    backgroundColor: v === 'DITERIMA' ? '#dcfce7' : '#fef9c3',
                                                    color: v === 'DITERIMA' ? '#15803d' : '#854d0e'
                                                }}>
                                                    {v}
                                                </span>
                                            )
                                        }
                                    ]}
                                    data={grup.rows}
                                    emptyText="Tidak ada item."
                                />
                                <div style={{
                                    textAlign: 'right',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border)',
                                    borderTop: 'none',
                                    borderRadius: '0 0 var(--radius-sm) var(--radius-sm)'
                                }}>
                                    Subtotal {tglFormatted}:{' '}
                                    <span style={{ color: 'var(--color-primary)' }}>
                                        Rp{subtotalGrup.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                        Tidak ada data belanja bahan pokok yang terealisasi pada periode ini.
                    </div>
                )}

                {/* Grand Total */}
                {lbbpData.grupTanggal && lbbpData.grupTanggal.length > 0 && (
                    <div style={{
                        textAlign: 'right',
                        padding: '12px 20px',
                        fontSize: '15px',
                        fontWeight: 700,
                        backgroundColor: '#1e3a5f',
                        color: '#fff',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '8px'
                    }}>
                        TOTAL KESELURUHAN:{' '}
                        Rp{Number(lbbpData.grandTotal || 0).toLocaleString('id-ID')}
                    </div>
                )}
            </div>
        ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Tekan &quot;Tampilkan LBBP&quot; untuk memuat data.
            </div>
        )
    );
};
