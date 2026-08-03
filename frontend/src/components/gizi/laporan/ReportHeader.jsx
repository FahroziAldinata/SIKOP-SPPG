import React from 'react';
import { FileText } from 'lucide-react';
import Dropdown from '../../ui/Dropdown';

export const REPORT_TYPE_OPTIONS = [
  { value: 'PEMENUHAN', label: 'Laporan Pemenuhan Gizi' },
  { value: 'REKAP_MENU', label: 'Laporan Rekap Menu' },
  { value: 'ORGANOLEPTIK', label: 'Laporan Uji Organoleptik & Alergi' }
];

export const ReportHeader = ({ jenisLaporan, setJenisLaporan, REPORT_TYPE_OPTIONS: propsOptions }) => {
  const options = propsOptions || REPORT_TYPE_OPTIONS;

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
          {jenisLaporan === 'ORGANOLEPTIK' ? 'Laporan Uji Organoleptik & Alergi' : jenisLaporan === 'REKAP_MENU' ? 'Laporan Rekap Menu' : 'Laporan Pemenuhan Gizi'}
        </h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          {jenisLaporan === 'ORGANOLEPTIK'
            ? 'Rekapitulasi uji organoleptik (rasa, aroma, tekstur, suhu saji) dan catatan alergi siswa'
            : jenisLaporan === 'REKAP_MENU'
            ? 'Rekapitulasi menu harian dan rincian bahan makanan per kelompok umur'
            : 'Rekapitulasi target & realisasi kandungan gizi per kelompok umur dan status approval'}
        </p>
      </div>

      <div style={{ minWidth: '240px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
          JENIS LAPORAN
        </label>
        <Dropdown
          options={options}
          value={jenisLaporan}
          onChange={(val) => setJenisLaporan(val)}
        />
      </div>
    </div>
  );
};

export default ReportHeader;
