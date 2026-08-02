import React from 'react';
import { Skeleton } from '../../Skeleton';

export const BulkJurnalModal = ({
    bulkModalOpen,
    bulkLoading,
    bulkData = [],
    bulkSaving,
    setBulkModalOpen,
    setBulkData,
    handleBulkHargaChange,
    handleBulkGenerate
}) => {
    if (!bulkModalOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                width: '95%',
                maxWidth: '1100px',
                maxHeight: '88vh',
                boxShadow: 'var(--shadow-hover)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                        Generate Jurnal (Bulk) — PO Direalisasi Belum Di-Jurnal
                    </h3>
                    <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', backgroundColor: 'rgba(79,70,229,0.12)', color: 'var(--color-primary, #4f46e5)', fontWeight: 700 }}>
                        {bulkData.length} PO
                    </span>
                </div>

                {bulkLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Skeleton height="40px" />
                        <Skeleton height="40px" />
                        <Skeleton height="40px" />
                    </div>
                ) : bulkData.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                        Tidak ada PO Direalisasi yang belum di-jurnal untuk periode ini.
                    </p>
                ) : (
                    <div style={{
                        overflow: 'auto',
                        maxHeight: '58vh',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg)', position: 'sticky', top: 0 }}>
                                    {['No', 'No PO', 'Supplier', 'Tanggal', 'Bahan', 'Qty', 'Harga (Rp)', 'Subtotal (Rp)'].map(h => (
                                        <th key={h} style={{
                                            padding: '8px 10px',
                                            textAlign: h === 'Harga (Rp)' || h === 'Subtotal (Rp)' || h === 'Qty' ? 'right' : 'left',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: 'var(--text-muted)',
                                            borderBottom: '1px solid var(--border)',
                                            whiteSpace: 'nowrap'
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {bulkData.map((po, pi) => {
                                    return po.items.map((it, ii) => {
                                        const firstRow = ii === 0;
                                        return (
                                            <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{firstRow ? pi + 1 : ''}</td>
                                                <td style={{ padding: '6px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>{firstRow ? po.nomorPo : ''}</td>
                                                <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{firstRow ? po.supplier?.nama : ''}</td>
                                                <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{firstRow ? (po.tanggal || '').split('T')[0] : ''}</td>
                                                <td style={{ padding: '6px 10px' }}>{it.namaBahan}</td>
                                                <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                    {Number(it.qtyRealisasi).toLocaleString('id-ID')} {it.satuan}
                                                </td>
                                                <td style={{ padding: '6px 10px', textAlign: 'right', width: '140px' }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={it.hargaSatuanRealisasi ?? ''}
                                                        onChange={e => handleBulkHargaChange(pi, ii, e.target.value)}
                                                        style={{
                                                            width: '110px',
                                                            padding: '5px 8px',
                                                            textAlign: 'right',
                                                            borderRadius: 'var(--radius-sm)',
                                                            border: '1px solid var(--border)',
                                                            backgroundColor: 'var(--bg)',
                                                            color: 'var(--text)',
                                                            fontSize: '13px',
                                                            fontVariantNumeric: 'tabular-nums'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                    {Number(it.subtotalRealisasi || 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        );
                                    }).concat(
                                        <tr key={`total-${po.id}`} style={{ backgroundColor: 'rgba(79,70,229,0.06)' }}>
                                            <td colSpan="7" style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                                                Total {po.nomorPo}:
                                            </td>
                                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                Rp{Number(po.total || 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '14px'
                }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                        {bulkData.length > 0 && (
                            <>Total: <span style={{ color: 'var(--color-primary, #4f46e5)' }}>Rp{bulkData.reduce((s, po) => s + Number(po.total || 0), 0).toLocaleString('id-ID')}</span></>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={() => { setBulkModalOpen(false); setBulkData([]); }}
                            disabled={bulkSaving}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'transparent',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '14px'
                            }}
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkGenerate}
                            disabled={bulkLoading || bulkSaving || bulkData.length === 0}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: bulkData.length === 0 ? 'var(--text-muted)' : 'var(--btn-primary-bg)',
                                color: 'var(--btn-primary-text)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: bulkData.length === 0 ? 'not-allowed' : 'pointer',
                                fontWeight: 700,
                                fontSize: '14px'
                            }}
                        >
                            Generate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkJurnalModal;
