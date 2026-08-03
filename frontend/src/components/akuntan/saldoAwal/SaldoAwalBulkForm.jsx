import React from 'react';
import Dropdown from '../../ui/Dropdown';
import { NumberInput } from '../../ui/NumberInput';

export const SaldoAwalBulkForm = ({
    bulkItems = [],
    bahanPokokList = [],
    bulkSubmitting = false,
    onAddRow,
    onRemoveRow,
    onItemChange,
    onSubmit
}) => {
    return (
        <form onSubmit={onSubmit} style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            marginBottom: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <div>
                <h3 style={{ margin: 0, color: 'var(--text)' }}>Input Banyak Sekaligus (Bulk)</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Input saldo awal untuk beberapa bahan pokok secara bersamaan. Data yang sudah ada akan ter-update otomatis.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {bulkItems.map((item, idx) => (
                    <div key={idx} style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        padding: '12px',
                        backgroundColor: 'var(--bg)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)'
                    }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', minWidth: '24px' }}>
                            #{idx + 1}
                        </span>
                        <div style={{ flex: '2 1 200px' }}>
                            <Dropdown
                                style={{ width: '100%' }}
                                value={item.bahanPokokId}
                                onChange={val => onItemChange(idx, 'bahanPokokId', val)}
                                searchable={true}
                                placeholder="-- Pilih Bahan Pokok --"
                                options={[
                                    { value: '', label: '-- Pilih Bahan Pokok --' },
                                    ...bahanPokokList.map(b => ({ value: b.id, label: `${b.nama} (${b.satuan})` }))
                                ]}
                            />
                        </div>
                        <div style={{ flex: '1 1 140px' }}>
                            <input
                                type="number"
                                step="0.001"
                                placeholder="Qty Saldo Awal"
                                value={item.saldoAwalQty}
                                onChange={e => onItemChange(idx, 'saldoAwalQty', e.target.value)}
                                className="form-field"
                            />
                        </div>
                        <div style={{ flex: '1 1 160px' }}>
                            <NumberInput
                                placeholder="Harga Beli Awal (Rp)"
                                value={item.hargaBeliAwal}
                                onChange={val => onItemChange(idx, 'hargaBeliAwal', val)}
                                className="form-field"
                            />
                        </div>
                        {bulkItems.length > 1 && (
                            <button
                                type="button"
                                onClick={() => onRemoveRow(idx)}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: 'var(--color-danger)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '14px'
                                }}
                                title="Hapus baris ini"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                <button
                    type="button"
                    onClick={onAddRow}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px'
                    }}
                >
                    + Tambah Baris
                </button>
                <button
                    type="submit"
                    disabled={bulkSubmitting}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: bulkSubmitting ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: '14px',
                        opacity: bulkSubmitting ? 0.7 : 1
                    }}
                >
                    {bulkSubmitting ? 'Memproses...' : 'Simpan Semua Bulk'}
                </button>
            </div>
        </form>
    );
};
