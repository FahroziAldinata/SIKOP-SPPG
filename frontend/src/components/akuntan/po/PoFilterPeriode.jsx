import React from 'react';
import Dropdown from '../../ui/Dropdown';

export const PoFilterPeriode = ({
    periods,
    selectedPeriodId,
    setSelectedPeriodId,
    setSelectedTanggalMulti,
    setIsMultiPrintModalOpen,
}) => {
    return (
        <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            marginBottom: '30px',
            width: '26%',
            minWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <div>
                <label style={{
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '6px'
                }}>
                    Pilih Periode
                </label>
                <Dropdown
                    style={{ width: '100%' }}
                    value={selectedPeriodId}
                    onChange={setSelectedPeriodId}
                    options={periods.map(p => ({
                        value: p.id,
                        label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
                    }))}
                />
            </div>
            <button
                type="button"
                onClick={() => {
                    setSelectedTanggalMulti([]);
                    setIsMultiPrintModalOpen(true);
                }}
                style={{
                    padding: '10px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px'
                }}
            >
                Cetak PO Gabungan
            </button>
        </div>
    );
};
