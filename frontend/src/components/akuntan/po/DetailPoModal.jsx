import React from 'react';
import { Table } from '../../Table';
import { getStatusStyle } from './statusStyles';

export const DetailPoModal = ({
    detailPoData,
    setDetailPoData,
    fetchPoPdf,
    renderDate,
}) => {
    if (!detailPoData) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                width: '100%',
                maxWidth: '850px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '24px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-hover)'
            }}>
                <h3 style={{ margin: '0 0 15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Detail PO - Tanggal {renderDate(detailPoData.tanggal)}</span>
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        ...getStatusStyle(detailPoData.status)
                    }}>{detailPoData.status}</span>
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '13px' }}>
                    <div>Supplier: <strong>{detailPoData.supplier?.nama}</strong></div>
                    <div>Catatan: {detailPoData.catatan || '—'}</div>
                    {detailPoData.diterimaAt && (
                        <div style={{ gridColumn: 'span 2' }}>
                            Diterima oleh: <strong>{detailPoData.diterimaOleh?.nama}</strong> pada {renderDate(detailPoData.diterimaAt)}
                        </div>
                    )}
                </div>

                <Table
                    columns={[
                        { key: 'nama', header: 'Bahan Pokok', render: (_, r) => r.bahanPokok?.nama },
                        { key: 'satuan', header: 'Satuan', align: 'center', render: (_, r) => r.bahanPokok?.satuan },
                        { key: 'qty', header: 'Qty Diminta', align: 'right', render: (v) => Number(v).toLocaleString('id-ID') },
                        { key: 'hargaSatuan', header: 'Harga Diminta', align: 'right', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` },
                        { key: 'subtotal', header: 'Subtotal Diminta', align: 'right', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` },
                        { 
                            key: 'qtyRealisasi', 
                            header: 'Qty Realisasi', 
                            align: 'right', 
                            render: (v) => v !== null ? Number(v).toLocaleString('id-ID') : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        },
                        { 
                            key: 'hargaSatuanRealisasi', 
                            header: 'Harga Realisasi', 
                            align: 'right', 
                            render: (v) => v !== null ? `Rp${Number(v).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        },
                        { 
                            key: 'subtotalRealisasi', 
                            header: 'Subtotal Realisasi', 
                            align: 'right', 
                            render: (v) => v !== null ? `Rp${Number(v).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                    ]}
                    data={detailPoData.items}
                />

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        onClick={() => fetchPoPdf(detailPoData.id, detailPoData.supplier?.nama)}
                        style={{ padding: '8px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 'bold' }}
                    >
                        Cetak PDF
                    </button>
                    <button
                        onClick={() => setDetailPoData(null)}
                        style={{ padding: '8px 16px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};
