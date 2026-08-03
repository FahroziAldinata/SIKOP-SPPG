import React from 'react';
import Dropdown from '../../ui/Dropdown';
import { NumberInput } from '../../ui/NumberInput';

export const SaldoAwalForm = ({
    editId = null,
    saldoAwalForm,
    bahanPokokList = [],
    onFormFieldChange,
    onSubmit,
    onCancelEdit
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--text)' }}>
                    {editId ? 'Edit Saldo Awal Barang' : 'Input Saldo Awal Barang (Single)'}
                </h3>
                {editId && (
                    <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(234,179,8,0.15)', color: '#ca8a04', fontWeight: 600 }}>
                        Mode Edit Active
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Bahan Pokok
                    </label>
                    <Dropdown
                        style={{ width: '100%' }}
                        value={saldoAwalForm.bahanPokokId}
                        onChange={val => onFormFieldChange('bahanPokokId', val)}
                        disabled={!!editId}
                        searchable={true}
                        placeholder="-- Pilih Bahan Pokok --"
                        options={[
                            { value: '', label: '-- Pilih Bahan Pokok --' },
                            ...bahanPokokList.map(b => ({ value: b.id, label: `${b.nama} (${b.satuan})` }))
                        ]}
                    />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Saldo Awal Qty
                    </label>
                    <input
                        type="number"
                        step="0.001"
                        placeholder="Jumlah Stok Awal"
                        value={saldoAwalForm.saldoAwalQty}
                        onChange={e => onFormFieldChange('saldoAwalQty', e.target.value)}
                        required
                        className="form-field"
                    />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Harga Beli Awal (Rp)
                    </label>
                    <NumberInput
                        placeholder="Harga Beli Awal"
                        value={saldoAwalForm.hargaBeliAwal}
                        onChange={val => onFormFieldChange('hargaBeliAwal', val)}
                        required
                        className="form-field"
                    />
                </div>
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <button type="submit" style={{
                    padding: '10px 20px',
                    backgroundColor: editId ? '#eab308' : 'var(--btn-primary-bg)',
                    color: editId ? '#000' : 'var(--btn-primary-text)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px'
                }}>
                    {editId ? 'Update Saldo Awal' : 'Simpan Saldo Awal'}
                </button>
                {editId && (
                    <button type="button" onClick={onCancelEdit} style={{
                        padding: '10px 20px',
                        backgroundColor: 'transparent',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}>
                        Batal
                    </button>
                )}
            </div>
        </form>
    );
};
