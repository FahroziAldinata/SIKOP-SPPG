import React from 'react';
import Dropdown from '../../ui/Dropdown';

export const ApprovalPeriodSelector = ({ periods, periodeId, setPeriodeId }) => {
    return (
        <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            marginBottom: '30px',
            width: '26%',
            minWidth: '320px'
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
                Periode
            </label>
            <Dropdown
                style={{ width: '100%' }}
                value={periodeId}
                onChange={setPeriodeId}
                options={periods.map(p => ({
                    value: p.id,
                    label: `${p.tanggalMulai.split('T')[0]} - ${p.tanggalSelesai.split('T')[0]}`
                }))}
            />
        </div>
    );
};
