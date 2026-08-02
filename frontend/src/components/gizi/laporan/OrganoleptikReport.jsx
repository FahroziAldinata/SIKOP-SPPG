import React from 'react';
import { Table } from '../../Table';
import { StatusBadge } from '../../StatusBadge';

export const OrganoleptikReport = ({ loading, data, columnsOrganoleptik, columnsAlergi }) => {
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
          {(item.blok || []).map((b, bIdx) => (
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

              {/* Tabel Organoleptik / Teks */}
              {b.organoleptik ? (
                <div>
                  <Table columns={columnsOrganoleptik} data={[b.organoleptik]} />
                  {b.organoleptik.catatan && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                      <strong>Catatan:</strong> {b.organoleptik.catatan}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Tidak ada data uji organoleptik
                </div>
              )}

              {/* Tabel Alergi / Teks */}
              {b.alergi && b.alergi.length > 0 ? (
                <Table columns={columnsAlergi} data={b.alergi} />
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Tidak ada alergi
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default OrganoleptikReport;
