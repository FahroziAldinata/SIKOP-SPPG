import React from 'react';
import Dropdown from '../../ui/Dropdown';
import { Table } from '../../ui/Table';
import { Skeleton } from '../../ui/Skeleton';
import { Printer, RefreshCw, Filter, FileText, School, Users } from 'lucide-react';

export const PeriodeReport = ({
  jenisLaporan,
  loadingMaster,
  periodOptions,
  selectedPeriodId,
  setSelectedPeriodId,
  loadingPeriode,
  fetchPeriode,
  handlePrint,
  periodeData
}) => {
  if (jenisLaporan !== 'PERIODE') return null;

  // --- Render Helpers for PERIODE ---
  const columnsPeriodePendidikan = [
    { key: 'no', header: 'No', width: '50px', align: 'center' },
    { key: 'nama', header: 'Nama PM' },
    { key: 'npsn', header: 'NPSN' },
    { key: 'alamat', header: 'Alamat' },
    { key: 'kecil', header: 'KECIL 1-3', align: 'right' },
    { key: 'besar46', header: 'BESAR 4-6', align: 'right' },
    { key: 'besarSmk', header: 'BESAR SMK', align: 'right' },
    { key: 'lk13', header: 'lk/1-3', align: 'right' },
    { key: 'p13', header: 'p/1-3', align: 'right' },
    { key: 'lk46', header: 'lk/4-6', align: 'right' },
    { key: 'p46', header: 'p/4-6', align: 'right' },
    { key: 'lkSmk', header: 'lk/smk', align: 'right' },
    { key: 'pSmk', header: 'p/smk', align: 'right' },
    { key: 'lkPic', header: 'lk/PIC', align: 'right' },
    { key: 'pPic', header: 'p/PIC', align: 'right' },
    { key: 'jmlPic', header: 'JML PIC', align: 'right' },
    { key: 'jumlahPm', header: 'JUMLAH PM', align: 'right' },
  ];

  const buildPeriodePendidikanRows = () => {
    if (!periodeData || !periodeData.pendidikan || !periodeData.pendidikan.sekolah) return [];
    const rows = periodeData.pendidikan.sekolah.map((item, idx) => ({
      id: item.id || idx,
      no: idx + 1,
      nama: item.nama,
      npsn: item.npsn || '-',
      alamat: item.alamat || '-',
      kecil: item.kecil?.toLocaleString('id-ID') || 0,
      besar46: item.besar46?.toLocaleString('id-ID') || 0,
      besarSmk: item.besarSmk?.toLocaleString('id-ID') || 0,
      lk13: item.lk13?.toLocaleString('id-ID') || 0,
      p13: item.p13?.toLocaleString('id-ID') || 0,
      lk46: item.lk46?.toLocaleString('id-ID') || 0,
      p46: item.p46?.toLocaleString('id-ID') || 0,
      lkSmk: item.lkSmk?.toLocaleString('id-ID') || 0,
      pSmk: item.pSmk?.toLocaleString('id-ID') || 0,
      lkPic: item.lkPic?.toLocaleString('id-ID') || 0,
      pPic: item.pPic?.toLocaleString('id-ID') || 0,
      jmlPic: item.jmlPic?.toLocaleString('id-ID') || 0,
      jumlahPm: <strong style={{ color: 'var(--color-primary)' }}>{item.jumlahPm?.toLocaleString('id-ID') || 0}</strong>,
    }));

    if (periodeData.pendidikan.total) {
      const tot = periodeData.pendidikan.total;
      rows.push({
        id: 'total-pendidikan',
        no: '—',
        nama: <strong style={{ color: 'var(--color-primary)' }}>JUMLAH</strong>,
        npsn: '—',
        alamat: '—',
        kecil: <strong>{tot.kecil?.toLocaleString('id-ID') || 0}</strong>,
        besar46: <strong>{tot.besar46?.toLocaleString('id-ID') || 0}</strong>,
        besarSmk: <strong>{tot.besarSmk?.toLocaleString('id-ID') || 0}</strong>,
        lk13: <strong>{tot.lk13?.toLocaleString('id-ID') || 0}</strong>,
        p13: <strong>{tot.p13?.toLocaleString('id-ID') || 0}</strong>,
        lk46: <strong>{tot.lk46?.toLocaleString('id-ID') || 0}</strong>,
        p46: <strong>{tot.p46?.toLocaleString('id-ID') || 0}</strong>,
        lkSmk: <strong>{tot.lkSmk?.toLocaleString('id-ID') || 0}</strong>,
        pSmk: <strong>{tot.pSmk?.toLocaleString('id-ID') || 0}</strong>,
        lkPic: <strong>{tot.lkPic?.toLocaleString('id-ID') || 0}</strong>,
        pPic: <strong>{tot.pPic?.toLocaleString('id-ID') || 0}</strong>,
        jmlPic: <strong>{tot.jmlPic?.toLocaleString('id-ID') || 0}</strong>,
        jumlahPm: <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>{tot.jumlahPm?.toLocaleString('id-ID') || 0}</strong>,
      });
    }
    return rows;
  };

  const getColumnsPeriodePosyandu = () => {
    const cols = [
      { key: 'no', header: 'No', width: '50px', align: 'center' },
      { key: 'nama', header: 'Nama Posyandu' },
      { key: 'balita', header: 'BALITA', align: 'right' },
      { key: 'bumil', header: 'BUMIL', align: 'right' },
      { key: 'busui', header: 'BUSUI', align: 'right' },
      { key: 'lkBalita', header: 'LK/BALITA', align: 'right' },
      { key: 'pBalita', header: 'P/BALITA', align: 'right' },
      { key: 'lkKader', header: 'LK/KADER', align: 'right' },
      { key: 'pKader', header: 'P/KADER', align: 'right' },
      { key: 'picKader', header: 'PIC KADER', align: 'right' },
      { key: 'jumlah', header: 'JUMLAH', align: 'right' },
    ];

    return cols;
  };

  const buildPeriodePosyanduRows = () => {
    if (!periodeData || !periodeData.posyandu || !periodeData.posyandu.posyandu) return [];
    const rows = periodeData.posyandu.posyandu.map((item, idx) => ({
      id: item.id || idx,
      no: idx + 1,
      nama: item.nama,
      balita: item.balita?.toLocaleString('id-ID') || 0,
      bumil: item.bumil?.toLocaleString('id-ID') || 0,
      busui: item.busui?.toLocaleString('id-ID') || 0,
      lkBalita: item.lkBalita?.toLocaleString('id-ID') || 0,
      pBalita: item.pBalita?.toLocaleString('id-ID') || 0,
      lkKader: !item.lkKader ? '-' : item.lkKader.toLocaleString('id-ID'),
      pKader: (item.pKader || 0).toLocaleString('id-ID'),
      picKader: item.picKader?.toLocaleString('id-ID') || 0,
      jumlah: <strong style={{ color: 'var(--color-primary)' }}>{item.jumlah?.toLocaleString('id-ID') || 0}</strong>,
    }));

    if (periodeData.posyandu.total) {
      const tot = periodeData.posyandu.total;
      rows.push({
        id: 'total-posyandu',
        no: '—',
        nama: <strong style={{ color: 'var(--color-primary)' }}>JUMLAH</strong>,
        balita: <strong>{tot.balita?.toLocaleString('id-ID') || 0}</strong>,
        bumil: <strong>{tot.bumil?.toLocaleString('id-ID') || 0}</strong>,
        busui: <strong>{tot.busui?.toLocaleString('id-ID') || 0}</strong>,
        lkBalita: <strong>{tot.lkBalita?.toLocaleString('id-ID') || 0}</strong>,
        pBalita: <strong>{tot.pBalita?.toLocaleString('id-ID') || 0}</strong>,
        lkKader: <strong>{!tot.lkKader ? '-' : tot.lkKader.toLocaleString('id-ID')}</strong>,
        pKader: <strong>{(tot.pKader || 0).toLocaleString('id-ID')}</strong>,
        picKader: <strong>{tot.picKader?.toLocaleString('id-ID') || 0}</strong>,
        jumlah: <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>{tot.jumlah?.toLocaleString('id-ID') || 0}</strong>,
      });
    }
    return rows;
  };

  return (
    <>
      {/* Header section */}
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
            Laporan Periode Aslap
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Rekapitulasi penerima manfaat per periode (Pendidikan &amp; Posyandu)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => fetchPeriode()}
            disabled={loadingPeriode}
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
            <RefreshCw size={16} className={loadingPeriode ? 'spin' : ''} />
            Tampilkan Laporan
          </button>

          <button
            onClick={handlePrint}
            disabled={loadingPeriode || !periodeData}
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
              cursor: (loadingPeriode || !periodeData) ? 'not-allowed' : 'pointer',
              opacity: (loadingPeriode || !periodeData) ? 0.6 : 1,
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
          <div style={{ maxWidth: '360px' }}>
            <Skeleton style={{ height: '42px', borderRadius: 'var(--radius-sm)' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '280px', flex: 1, maxWidth: '400px' }}>
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

            <button
              onClick={() => fetchPeriode()}
              disabled={loadingPeriode}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                fontWeight: '700',
                cursor: loadingPeriode ? 'not-allowed' : 'pointer',
                opacity: loadingPeriode ? 0.7 : 1,
                fontSize: '14px'
              }}
            >
              {loadingPeriode ? 'Memuat...' : 'Tampilkan'}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      {loadingPeriode ? (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Skeleton style={{ height: '36px', width: '300px' }} />
            <Skeleton style={{ height: '180px', width: '100%' }} />
            <Skeleton style={{ height: '180px', width: '100%' }} />
          </div>
        </div>
      ) : !periodeData ? (
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
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px 0' }}>Data Laporan Periode Tidak Ditemukan</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, maxWidth: '480px', marginInline: 'auto' }}>
            Belum ada data penerima manfaat yang terdaftar pada periode ini.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

            {/* Section 1: Tabel Pendidikan */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              boxShadow: 'var(--shadow)',
              padding: '24px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <School size={20} />
                    Sektor Pendidikan
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Rekapitulasi penerima manfaat per sekolah
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total PM Pendidikan: </span>
                  <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>
                    {(periodeData.pendidikan?.total?.jumlahPm || 0).toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>

              <Table
                columns={columnsPeriodePendidikan}
                data={buildPeriodePendidikanRows()}
                emptyText="Tidak ada data penerima manfaat pendidikan pada periode ini."
              />
            </div>

            {/* Section 2: Tabel Posyandu */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              boxShadow: 'var(--shadow)',
              padding: '24px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} />
                    Sektor Posyandu
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Rekapitulasi penerima manfaat per posyandu
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total PM Posyandu: </span>
                  <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>
                    {(periodeData.posyandu?.total?.jumlah || 0).toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>

              <Table
                columns={getColumnsPeriodePosyandu()}
                data={buildPeriodePosyanduRows()}
                emptyText="Tidak ada data penerima manfaat posyandu pada periode ini."
              />
            </div>
          </div>

          {/* Ringkasan card */}
          {periodeData && (
            <div style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginTop: '16px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Ringkasan</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total PIC Sekolah (Pendidik + Tendik)</span>
                  <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>
                    {(periodeData.pendidikan?.total?.jmlPic || 0).toLocaleString('id-ID')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total PIC Kader Posyandu</span>
                  <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>
                    {(periodeData.posyandu?.total?.picKader || 0).toLocaleString('id-ID')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '14px', color: '#ffffff', fontWeight: '700' }}>Grand Total Penerima Manfaat</span>
                  <strong style={{ fontSize: '18px', color: '#ffffff' }}>
                    {((periodeData.pendidikan?.total?.jumlahPm || 0) + (periodeData.posyandu?.total?.jumlah || 0)).toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};
