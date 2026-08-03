import React from 'react';
import Dropdown from '../../ui/Dropdown';

export const QuickFillPo = ({
    selectedPrefillPoId,
    setSelectedPrefillPoId,
    realizedPoList = [],
    handlePrefillFromPo,
    openBulkModal,
    periodeId
}) => {
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '-4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginRight: '4px' }}>
                Isi dari PO:
            </span>
            <Dropdown
                style={{ minWidth: '220px' }}
                value={selectedPrefillPoId}
                onChange={setSelectedPrefillPoId}
                options={[
                    { value: '', label: '-- Pilih PO Direalisasi --' },
                    ...realizedPoList.map(po => ({
                        value: po.id,
                        label: `${(po.tanggal || '').split('T')[0]} - ${po.supplier?.nama} (Rp${Number(po.total || 0).toLocaleString('id-ID')})`
                    }))
                ]}
            />
            <button
                type="button"
                disabled={!selectedPrefillPoId}
                onClick={handlePrefillFromPo}
                style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid var(--color-primary, #4f46e5)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: selectedPrefillPoId ? 'var(--color-primary, #4f46e5)' : 'transparent',
                    color: selectedPrefillPoId ? '#ffffff' : 'var(--color-primary, #4f46e5)',
                    cursor: selectedPrefillPoId ? 'pointer' : 'not-allowed',
                    opacity: selectedPrefillPoId ? 1 : 0.45,
                }}
            >
                Isi dari PO
            </button>
            <button
                type="button"
                onClick={openBulkModal}
                disabled={!periodeId}
                style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid var(--color-primary, #4f46e5)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: periodeId ? 'var(--color-primary, #4f46e5)' : 'var(--text-muted)',
                    color: periodeId ? '#ffffff' : 'var(--text-muted)',
                    cursor: periodeId ? 'pointer' : 'not-allowed',
                    opacity: periodeId ? 1 : 0.45,
                }}
            >
                Generate Jurnal (Bulk)
            </button>
        </div>
    );
};

export default QuickFillPo;
