import React from 'react';
import Dropdown from '../../Dropdown';
import { GrupHariManager } from '../../GrupHariManager';

export const TopToolbar = ({
  periods,
  selectedPeriodId,
  setSelectedPeriodId,
  resetForm,
  grupHariList,
  fetchGrupHari,
  fetchList,
  selectedGrupId,
  setSelectedGrupId
}) => {
  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      marginBottom: '30px',
      flexWrap: 'wrap'
    }}>
      {/* Period Selection */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        flex: '0 0 auto',
        width: '26%',
        minWidth: '280px'
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
          value={selectedPeriodId}
          onChange={(val) => {
            setSelectedPeriodId(val);
            resetForm();
          }}
          options={periods.map(p => ({
            value: p.id,
            label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
          }))}
        />
      </div>

      {/* GrupHariManager */}
      <div style={{
        flex: 1,
        minWidth: '400px'
      }}>
        <GrupHariManager
          periodeId={selectedPeriodId}
          grupHariList={grupHariList}
          onRefresh={() => {
            fetchGrupHari(selectedPeriodId);
            fetchList(selectedPeriodId);
          }}
          selectedGrupId={selectedGrupId}
          onSelectGrup={(gId) => setSelectedGrupId(gId)}
        />
      </div>
    </div>
  );
};
