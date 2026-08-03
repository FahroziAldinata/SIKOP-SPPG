import React from 'react';
import { Table } from '../../ui/Table';

export const NeracaSaldoTable = ({ neracaData, previewNeracaSaldoPdf, pdfLoading }) => {
    return (
        neracaData ? (
            <div>
                {/* Verification badge & PDF Button */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    gap: '12px',
                    marginBottom: '16px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 600,
                        background: neracaData.verifikasi.danaBiayaCocok
                            ? 'rgba(34,197,94,0.12)'
                            : 'rgba(239,68,68,0.12)',
                        border: `1px solid ${neracaData.verifikasi.danaBiayaCocok ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                        color: neracaData.verifikasi.danaBiayaCocok ? '#16a34a' : '#dc2626',
                    }}>
                        {neracaData.verifikasi.pesan}
                    </div>
                    <button
                        type="button"
                        onClick={previewNeracaSaldoPdf}
                        disabled={pdfLoading}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: pdfLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: pdfLoading ? 0.65 : 1
                        }}
                    >
                        {pdfLoading ? 'Membuat PDF...' : '📄 Preview PDF'}
                    </button>
                </div>
                <Table
                    columns={[
                        { key: 'kode', header: 'Kode', render: (v) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</span> },
                        { key: 'nama', header: 'Nama Akun' },
                        {
                            key: 'tipe', header: 'Tipe',
                            render: (v) => {
                                const color = { KAS: '#0ea5e9', DANA: '#8b5cf6', BIAYA: '#f97316', PAJAK: '#64748b' }[v] || 'inherit';
                                return <span style={{ color, fontWeight: 600, fontSize: '12px' }}>{v}</span>;
                            }
                        },
                        {
                            key: 'saldoAwal', header: 'Saldo Awal', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Number(v) !== 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}</span>
                        },
                        {
                            key: 'totalDebet', header: 'Total Debet', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', color: Number(v) > 0 ? 'var(--color-success)' : 'inherit' }}>{Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}</span>
                        },
                        {
                            key: 'totalKredit', header: 'Total Kredit', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', color: Number(v) > 0 ? 'var(--color-danger)' : 'inherit' }}>{Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}</span>
                        },
                        {
                            key: 'saldoAkhir', header: 'Saldo Akhir', align: 'center',
                            render: (v) => <strong style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(v).toLocaleString('id-ID')}</strong>
                        },
                    ]}
                    data={neracaData.akun || []}
                    emptyText="Tidak ada data akun untuk periode ini."
                />
            </div>
        ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Tidak ada data. Pastikan setup lembaga sudah terkonfigurasi.
            </div>
        )
    );
};
