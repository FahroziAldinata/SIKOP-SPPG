import React from 'react';
import Dropdown from '../../ui/Dropdown';

export const PeriodeSelector = ({
    periods = [],
    periodeId = '',
    onPeriodeChange,
    selectedPeriod = null
}) => {
    return (
        <div style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            alignItems: 'stretch',
            marginBottom: '30px'
        }}>
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                flex: '1 1 300px'
            }}>
                <label style={{
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '6px'
                }}>
                    Pilih Periode Aktif
                </label>
                <Dropdown
                    style={{ width: '100%' }}
                    value={periodeId}
                    onChange={onPeriodeChange}
                    options={periods.map(p => ({ value: p.id, label: `${p.tanggalMulai} - ${p.tanggalSelesai}` }))}
                />
            </div>

            {/* Header Identitas SPPG + Periode */}
            {selectedPeriod && (
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    backgroundColor: 'var(--bg-elevated)',
                    boxShadow: 'var(--shadow)',
                    flex: '2 1 400px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '6px'
                }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                        Identitas Laporan Persediaan
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                        {selectedPeriod.setupLembaga?.namaLembaga || 'SPPG (Lembaga Terdaftar)'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Periode: <strong>{selectedPeriod.tanggalMulai}</strong> s.d. <strong>{selectedPeriod.tanggalSelesai}</strong>
                    </div>
                </div>
            )}
        </div>
    );
};
