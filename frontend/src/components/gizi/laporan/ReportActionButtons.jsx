import React from 'react';
import Dropdown from '../../Dropdown';
import { Search, Printer } from 'lucide-react';

export const ReportActionButtons = ({
  blokOptions,
  blokKode,
  setBlokKode,
  loading,
  handleTampilkan,
  handlePrint,
  isDataEmpty,
  pdfLoading
}) => {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
          BLOK
        </label>
        <Dropdown
          options={blokOptions}
          value={blokKode}
          onChange={(val) => setBlokKode(val)}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={handleTampilkan}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <Search size={16} />
          {loading ? 'Memuat...' : 'Tampilkan'}
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={handlePrint}
          disabled={isDataEmpty || pdfLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            cursor: (isDataEmpty || pdfLoading) ? 'not-allowed' : 'pointer',
            opacity: (isDataEmpty || pdfLoading) ? 0.6 : 1
          }}
        >
          <Printer size={16} />
          {pdfLoading ? 'Mengunduh...' : 'Cetak'}
        </button>
      </div>
    </>
  );
};

export default ReportActionButtons;
