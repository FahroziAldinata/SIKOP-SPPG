import React from 'react';
import Dropdown from '../../Dropdown';
import { FileText } from 'lucide-react';
import { REPORT_TYPE_OPTIONS } from './constants';

export const ReportTypeSelector = ({ jenisLaporan, setJenisLaporan }) => {
  return (
    <div
      className="no-print"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px 24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}
    >
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={26} color="var(--color-primary)" />
          Laporan ASLAP
        </h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          Pilih jenis laporan untuk melihat dan mencetak rekapitulasi data penerima manfaat
        </p>
      </div>

      <div style={{ minWidth: '240px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
          JENIS LAPORAN
        </label>
        <Dropdown
          options={REPORT_TYPE_OPTIONS}
          value={jenisLaporan}
          onChange={(val) => setJenisLaporan(val)}
        />
      </div>
    </div>
  );
};
