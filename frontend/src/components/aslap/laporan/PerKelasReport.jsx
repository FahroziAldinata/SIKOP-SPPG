import React from 'react';
import Dropdown from '../../Dropdown';
import { Skeleton } from '../../Skeleton';
import { FileText, RefreshCw, Printer, Filter, School, BookOpen, Users } from 'lucide-react';

export const PerKelasReport = ({
  jenisLaporan,
  loadingMaster,
  periodOptions,
  schoolOptions,
  selectedPeriodId,
  selectedSekolahId,
  setSelectedPeriodId,
  setSelectedSekolahId,
  loadingPerKelas,
  fetchPerKelas,
  handlePrint,
  perKelasData
}) => {
  if (jenisLaporan !== 'PER_KELAS') return null;

  // --- Render Helpers for PER_KELAS ---
  const totalSekolahCount = perKelasData.length;
  const totalKelasCount = perKelasData.reduce((acc, curr) => acc + (curr.totalKelas || 0), 0);
  const totalSiswaCount = perKelasData.reduce((acc, curr) => acc + (curr.totalJumlah || 0), 0);

  return (
    <>
      {/* Header section with print style toggle */}
      <div
        className="no-print"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow)',
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="var(--color-primary)" />
            Laporan Per Kelas (ASLAP)
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Rekapitulasi rincian kelas dan jumlah penerima manfaat per sekolah per periode
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => fetchPerKelas()}
            disabled={loadingPerKelas}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <RefreshCw size={16} className={loadingPerKelas ? 'spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handlePrint}
            disabled={loadingPerKelas || perKelasData.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              fontWeight: '700',
              cursor: (loadingPerKelas || perKelasData.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (loadingPerKelas || perKelasData.length === 0) ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(7, 30, 73, 0.2)',
              fontSize: '14px'
            }}
          >
            <Printer size={16} />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div
        className="no-print"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow)',
          marginBottom: '30px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '700', color: 'var(--color-primary)' }}>
          <Filter size={18} />
          <span>Filter Laporan</span>
        </div>

        {loadingMaster ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <Skeleton style={{ height: '42px', borderRadius: 'var(--radius-sm)' }} />
            <Skeleton style={{ height: '42px', borderRadius: 'var(--radius-sm)' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Periode Laporan <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <Dropdown
                options={periodOptions}
                value={selectedPeriodId}
                onChange={(val) => setSelectedPeriodId(val)}
                placeholder="-- Pilih Periode --"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Filter Sekolah (Opsional)
              </label>
              <Dropdown
                options={schoolOptions}
                value={selectedSekolahId}
                onChange={(val) => setSelectedSekolahId(val)}
                placeholder="Semua Sekolah"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Summary */}
      {!loadingPerKelas && perKelasData.length > 0 && (
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(7, 30, 73, 0.08)', color: 'var(--color-primary)' }}>
              <School size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Total Sekolah</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>{totalSekolahCount}</div>
            </div>
          </div>

          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <BookOpen size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Total Rombel / Kelas</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>{totalKelasCount}</div>
            </div>
          </div>

          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Total Siswa / Penerima</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>{totalSiswaCount.toLocaleString('id-ID')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Report List */}
      {loadingPerKelas ? (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Skeleton style={{ height: '30px', width: '40%' }} />
            <Skeleton style={{ height: '120px', width: '100%' }} />
            <Skeleton style={{ height: '30px', width: '40%' }} />
            <Skeleton style={{ height: '120px', width: '100%' }} />
          </div>
        </div>
      ) : perKelasData.length === 0 ? (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow)',
          padding: '48px 24px',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px 0' }}>Data Laporan Per Kelas Tidak Ditemukan</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, maxWidth: '480px', marginInline: 'auto' }}>
            Belum ada rincian detail kelas yang diinput pada periode ini{selectedSekolahId ? ' untuk sekolah terpilih' : ''}.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {perKelasData.map((item) => (
            <div key={item.sekolah.id} style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              boxShadow: 'var(--shadow)',
              padding: '24px',
              overflow: 'hidden',
              marginBottom: '24px'
            }}>
              {/* School Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border)',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0 }}>{item.sekolah.nama}</h3>
                    {item.sekolah.jenjang && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: 'rgba(7, 30, 73, 0.1)',
                        color: 'var(--color-primary)'
                      }}>
                        {item.sekolah.jenjang}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    NPSN: <strong>{item.sekolah.npsn || '-'}</strong> | Alamat: {item.sekolah.alamat || '-'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Jumlah Kelas</span>
                    <div style={{ fontWeight: '700', color: 'var(--text)' }}>{item.totalKelas} Kelas</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Siswa</span>
                    <div style={{ fontWeight: '800', color: 'var(--color-primary)' }}>{item.totalJumlah.toLocaleString('id-ID')} Siswa</div>
                  </div>
                </div>
              </div>

              {/* Class Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', width: '60px', fontWeight: '700', color: 'var(--text-muted)' }}>No</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-muted)' }}>Nama Kelas</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--text-muted)' }}>Jumlah Siswa / Penerima</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.kelas.map((k, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{index + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '600' }}>{k.namaKelas}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>{k.jumlah.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: 'rgba(7, 30, 73, 0.03)', fontWeight: '800' }}>
                      <td colSpan={2} style={{ padding: '12px', textAlign: 'right' }}>Subtotal {item.sekolah.nama}:</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: 'var(--color-primary)', fontSize: '14px' }}>
                        {item.totalJumlah.toLocaleString('id-ID')} Siswa
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {/* Grand Total Summary Box */}
          <div style={{
            border: '1px solid rgba(7, 30, 73, 0.2)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary-light)',
            boxShadow: 'var(--shadow)',
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)' }}>TOTAL KESELURUHAN LAPORAN</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Mencakup {totalSekolahCount} sekolah dan {totalKelasCount} rombel/kelas
              </p>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>
              {totalSiswaCount.toLocaleString('id-ID')} Total Siswa
            </div>
          </div>
        </div>
      )}
    </>
  );
};
