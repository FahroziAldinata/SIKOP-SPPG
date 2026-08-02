import React from 'react';
import { Table } from '../../Table';
import { StatusBadge } from '../../StatusBadge';

export const PemenuhanReport = ({ loading, data, columnsGizi }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {data.map((item, itemIdx) => (
        <div
          key={item.tanggal || itemIdx}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Header Tanggal + Status + Jumlah Blok */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '14px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                Tanggal: {item.tanggal}
              </h3>
              <StatusBadge status={item.status} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              {(item.blok || []).length} Blok
            </span>
          </div>

          {/* Sub-sections per blok */}
          {(item.blok || []).map((b, bIdx) => {
            const menuStr = (b.menu || []).map(m => `${m.namaMenu}${m.komponen ? ` (${m.komponen})` : ''}`).join(', ') || '—';
            return (
              <div
                key={b.kelompokUmurKode || bIdx}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '18px',
                  backgroundColor: 'var(--bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Judul Blok */}
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  BLOK {b.kelompokUmurNama} ({b.rentangUsia || '-'}) — {b.porsi?.toLocaleString('id-ID')} porsi
                </div>

                {/* Baris Menu */}
                <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                  <strong>Menu:</strong> {menuStr}
                </div>

                {/* Tabel Gizi */}
                <Table columns={columnsGizi} data={b.gizi || []} emptyText="Tidak ada data gizi" />

                {/* Total Biaya */}
                <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
                  Total Biaya: Rp {Number(b.totalBiaya || 0).toLocaleString('id-ID')}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default PemenuhanReport;
