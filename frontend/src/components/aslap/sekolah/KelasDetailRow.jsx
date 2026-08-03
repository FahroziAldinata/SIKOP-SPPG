import React from 'react';
import { Skeleton } from '../../ui/Skeleton';
import { categoryLabelMap as defaultCategoryLabelMap } from './constants';

export const KelasDetailRow = ({
  sekolah,
  kelasLoading,
  kelasMap,
  handleOpenAddKelasModal,
  handleOpenEditKelasModal,
  handleDeleteKelasClick,
  categoryLabelMap = defaultCategoryLabelMap,
  isLast = false
}) => {
  return (
    <tr key={`expand-row-${sekolah.id}`}>
      <td colSpan={7} style={{ padding: '16px 24px', backgroundColor: 'var(--bg)', borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
        <div style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px'
          }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
              Detail Kelas — {sekolah.nama}
            </h4>
            <button
              type="button"
              onClick={() => handleOpenAddKelasModal(sekolah.id)}
              style={{
                padding: '8px 14px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              + Tambah Kelas
            </button>
          </div>

          {kelasLoading && !kelasMap[sekolah.id] ? (
            <Skeleton count={3} height={36} />
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textAlign: 'center', width: '60px', borderBottom: '1px solid var(--border)', color: 'var(--table-header-text)' }}>No</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--table-header-text)' }}>Kategori Kelas</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textAlign: 'right', width: '150px', borderBottom: '1px solid var(--border)', color: 'var(--table-header-text)' }}>Jumlah</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textAlign: 'center', width: '140px', borderBottom: '1px solid var(--border)', color: 'var(--table-header-text)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(!kelasMap[sekolah.id] || kelasMap[sekolah.id].length === 0) ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Belum ada data detail kelas untuk sekolah dan periode terpilih.
                    </td>
                  </tr>
                ) : (
                  kelasMap[sekolah.id].map((k, kIdx) => (
                    <tr key={k.id} style={{ borderBottom: kIdx < kelasMap[sekolah.id].length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '13px' }}>{kIdx + 1}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>{categoryLabelMap[k.namaKelas] || k.namaKelas}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '13px' }}>{k.jumlah} siswa</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditKelasModal(k, sekolah.id)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: 'var(--btn-secondary-bg, #e5e7eb)',
                              color: 'var(--text)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKelasClick(k.id, sekolah.id)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: 'var(--color-danger, #ef4444)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
};
