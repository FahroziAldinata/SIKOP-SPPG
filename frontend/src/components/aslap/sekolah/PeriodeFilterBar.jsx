import React from 'react';
import Dropdown from '../../Dropdown';

export const PeriodeFilterBar = ({ selectedPeriodId, handlePeriodChange, periodeOptions }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '20px',
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      boxShadow: 'var(--shadow)'
    }}>
      <div style={{ flex: '0 0 auto' }}>
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
          style={{ width: '280px' }}
          value={selectedPeriodId}
          onChange={handlePeriodChange}
          options={periodeOptions}
          placeholder="-- Pilih Periode --"
        />
      </div>
    </div>
  );
};
