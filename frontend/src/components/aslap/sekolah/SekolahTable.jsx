import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Skeleton } from '../../Skeleton';
import { categoryLabelMap as defaultCategoryLabelMap } from './constants';
import { KelasDetailRow } from './KelasDetailRow';

export const SekolahTable = ({
  loading,
  sekolahList,
  expandedSekolahId,
  handleToggleExpand,
  handleOpenEditModal,
  handleDeleteClick,
  handleOpenAddKelasModal,
  kelasLoading,
  kelasMap,
  handleOpenEditKelasModal,
  handleDeleteKelasClick,
  categoryLabelMap = defaultCategoryLabelMap
}) => {
  if (loading) {
    return <Skeleton count={5} height={40} />;
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflowX: 'auto',
      backgroundColor: 'var(--bg-elevated)',
      boxShadow: 'var(--shadow)',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        boxSizing: 'border-box'
      }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
            <th style={{ padding: '12px 18px', textAlign: 'center', width: '50px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}></th>
            <th style={{ padding: '12px 18px', textAlign: 'center', width: '60px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>No</th>
            <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>Nama</th>
            <th style={{ padding: '12px 18px', textAlign: 'center', width: '120px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>Jenjang</th>
            <th style={{ padding: '12px 18px', textAlign: 'center', width: '140px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>NPSN</th>
            <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>Alamat</th>
            <th style={{ padding: '12px 18px', textAlign: 'center', width: '140px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {sekolahList.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                Belum ada data sekolah.
              </td>
            </tr>
          ) : (
            sekolahList.map((row, idx) => {
              const isExpanded = expandedSekolahId === row.id;
              return (
                <React.Fragment key={row.id}>
                  <tr
                    style={{
                      backgroundColor: isExpanded ? 'rgba(7, 30, 73, 0.03)' : 'transparent',
                      transition: 'background-color var(--transition-fast)'
                    }}
                  >
                    <td style={{ padding: '16px 18px', textAlign: 'center', verticalAlign: 'middle', borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(row.id)}
                        title={isExpanded ? "Tutup Rincian Kelas" : "Lihat Rincian Kelas"}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'center', verticalAlign: 'middle', fontSize: 14, borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'left', verticalAlign: 'middle', fontSize: 14, borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                      <strong style={{ color: 'var(--text)' }}>{row.nama}</strong>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'center', verticalAlign: 'middle', fontSize: 14, borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                      {row.jenjang}
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'center', verticalAlign: 'middle', fontSize: 14, borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                      {row.npsn || '-'}
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'left', verticalAlign: 'middle', fontSize: 14, borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                      {row.alamat || '-'}
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'center', verticalAlign: 'middle', borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleOpenEditModal(row)}
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
                          onClick={() => handleDeleteClick(row.id)}
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

                  {/* Sub-tabel Kelas saat row di-expand */}
                  {isExpanded && (
                    <KelasDetailRow
                      sekolah={row}
                      kelasLoading={kelasLoading}
                      kelasMap={kelasMap}
                      handleOpenAddKelasModal={handleOpenAddKelasModal}
                      handleOpenEditKelasModal={handleOpenEditKelasModal}
                      handleDeleteKelasClick={handleDeleteKelasClick}
                      categoryLabelMap={categoryLabelMap}
                      isLast={idx === sekolahList.length - 1}
                    />
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
