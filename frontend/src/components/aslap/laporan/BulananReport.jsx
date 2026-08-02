import React from 'react';
import Dropdown from '../../Dropdown';
import { Table } from '../../Table';
import { Skeleton } from '../../Skeleton';
import { Calendar, RefreshCw, Printer, Filter, FileText } from 'lucide-react';
import { BULAN_OPTIONS } from './constants';

export const BulananReport = ({
  jenisLaporan,
  loadingMaster,
  bulan,
  tahun,
  setBulan,
  setTahun,
  loadingBulanan,
  fetchBulanan,
  handlePrint,
  bulananData
}) => {
  if (jenisLaporan !== 'BULANAN') return null;

  // --- Render Helpers for BULANAN ---
  const columnsBulananPeserta = [
    { key: 'no', header: 'No', width: '45px', align: 'center' },
    { key: 'hari', header: 'Hari', align: 'left', width: '90px' },
    { key: 'tanggal', header: 'Tanggal', align: 'center', width: '100px' },
    { key: 'periodeId', header: 'Periode', align: 'left' },
    { key: 'paudTk', header: 'PAUD/TK', align: 'right' },
    { key: 'sd1_3', header: 'SD 1-3', align: 'right' },
    { key: 'sd4_6', header: 'SD 4-6', align: 'right' },
    { key: 'smp', header: 'SMP', align: 'right' },
    { key: 'sma', header: 'SMA', align: 'right' },
    { key: 'ats9', header: 'ATS<9', align: 'right' },
    { key: 'ats9_18', header: 'ATS9-18', align: 'right' },
    { key: 'pendidik', header: 'Pendidik', align: 'right' },
    { key: 'tendik', header: 'Tendik', align: 'right' },
    { key: 'jmlPic', header: 'JML PIC', align: 'right' },
  ];

  const columnsBulananNonPeserta = [
    { key: 'no', header: 'No', width: '45px', align: 'center' },
    { key: 'hari', header: 'Hari', align: 'left', width: '90px' },
    { key: 'tanggal', header: 'Tanggal', align: 'center', width: '100px' },
    { key: 'bumil', header: 'Bumil', align: 'right' },
    { key: 'busui', header: 'Busui', align: 'right' },
    { key: 'balita', header: 'Balita', align: 'right' },
    { key: 'kader', header: 'Kader', align: 'right' },
    { key: 'total', header: 'Total', align: 'right', width: '100px' },
  ];

  const buildBulananPesertaRows = () => {
    if (!bulananData || !Array.isArray(bulananData.hari)) return [];
    const rows = bulananData.hari.map((item, idx) => ({
      id: item.tanggal || idx,
      no: idx + 1,
      hari: item.hari,
      tanggal: item.tanggal,
      periodeId: item.periodeId || '-',
      paudTk: item.paudTk?.toLocaleString('id-ID') || 0,
      sd1_3: item.sd1_3?.toLocaleString('id-ID') || 0,
      sd4_6: item.sd4_6?.toLocaleString('id-ID') || 0,
      smp: item.smp?.toLocaleString('id-ID') || 0,
      sma: item.sma?.toLocaleString('id-ID') || 0,
      ats9: item.ats9?.toLocaleString('id-ID') || 0,
      ats9_18: item.ats9_18?.toLocaleString('id-ID') || 0,
      pendidik: item.pendidik?.toLocaleString('id-ID') || 0,
      tendik: item.tendik?.toLocaleString('id-ID') || 0,
      jmlPic: <strong style={{ color: 'var(--color-primary)' }}>{(item.jmlPic || 0).toLocaleString('id-ID')}</strong>,
    }));

    if (bulananData.total) {
      const tot = bulananData.total;
      rows.push({
        id: 'total-bulanan-peserta',
        no: '—',
        hari: <strong style={{ color: 'var(--color-primary)' }}>TOTAL</strong>,
        tanggal: '—',
        periodeId: '—',
        paudTk: <strong>{tot.paudTk?.toLocaleString('id-ID') || 0}</strong>,
        sd1_3: <strong>{tot.sd1_3?.toLocaleString('id-ID') || 0}</strong>,
        sd4_6: <strong>{tot.sd4_6?.toLocaleString('id-ID') || 0}</strong>,
        smp: <strong>{tot.smp?.toLocaleString('id-ID') || 0}</strong>,
        sma: <strong>{tot.sma?.toLocaleString('id-ID') || 0}</strong>,
        ats9: <strong>{tot.ats9?.toLocaleString('id-ID') || 0}</strong>,
        ats9_18: <strong>{tot.ats9_18?.toLocaleString('id-ID') || 0}</strong>,
        pendidik: <strong>{tot.pendidik?.toLocaleString('id-ID') || 0}</strong>,
        tendik: <strong>{tot.tendik?.toLocaleString('id-ID') || 0}</strong>,
        jmlPic: <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>{(tot.jmlPic || 0).toLocaleString('id-ID')}</strong>,
      });
    }
    return rows;
  };

  const buildBulananNonPesertaRows = () => {
    if (!bulananData || !Array.isArray(bulananData.hari)) return [];
    const rows = bulananData.hari.map((item, idx) => ({
      id: item.tanggal || idx,
      no: idx + 1,
      hari: item.hari,
      tanggal: item.tanggal,
      bumil: item.bumil?.toLocaleString('id-ID') || 0,
      busui: item.busui?.toLocaleString('id-ID') || 0,
      balita: item.balita?.toLocaleString('id-ID') || 0,
      kader: item.kader?.toLocaleString('id-ID') || 0,
      total: <strong style={{ color: 'var(--color-primary)' }}>{item.total?.toLocaleString('id-ID') || 0}</strong>,
    }));

    if (bulananData.total) {
      const tot = bulananData.total;
      rows.push({
        id: 'total-bulanan-nonpeserta',
        no: '—',
        hari: <strong style={{ color: 'var(--color-primary)' }}>TOTAL</strong>,
        tanggal: '—',
        bumil: <strong>{tot.bumil?.toLocaleString('id-ID') || 0}</strong>,
        busui: <strong>{tot.busui?.toLocaleString('id-ID') || 0}</strong>,
        balita: <strong>{tot.balita?.toLocaleString('id-ID') || 0}</strong>,
        kader: <strong>{tot.kader?.toLocaleString('id-ID') || 0}</strong>,
        total: <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>{tot.total?.toLocaleString('id-ID') || 0}</strong>,
      });
    }
    return rows;
  };

  const namaBulanSelect = BULAN_OPTIONS.find(b => b.value === Number(bulan))?.label || '';

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
            <Calendar size={22} color="var(--color-primary)" />
            Laporan Bulanan Aslap
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Rekapitulasi harian penerima manfaat per kategori dalam 1 bulan (Pendidikan &amp; Posyandu)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchBulanan}
            disabled={loadingBulanan}
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
            <RefreshCw size={16} className={loadingBulanan ? 'spin' : ''} />
            Tampilkan Laporan
          </button>

          <button
            onClick={handlePrint}
            disabled={loadingBulanan || !bulananData || !bulananData.hari || bulananData.hari.length === 0}
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
              cursor: (loadingBulanan || !bulananData || !bulananData.hari || bulananData.hari.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (loadingBulanan || !bulananData || !bulananData.hari || bulananData.hari.length === 0) ? 0.6 : 1,
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
          <span>Filter Laporan Bulanan</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '200px', flex: 1, maxWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
              Bulan <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <Dropdown
              options={BULAN_OPTIONS}
              value={bulan}
              onChange={(val) => setBulan(Number(val))}
              placeholder="-- Pilih Bulan --"
            />
          </div>

          <div style={{ minWidth: '150px', flex: 1, maxWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
              Tahun <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="number"
              value={tahun}
              onChange={(e) => setTahun(parseInt(e.target.value) || '')}
              placeholder="Contoh: 2026"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: '600',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={fetchBulanan}
            disabled={loadingBulanan}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              fontWeight: '700',
              cursor: loadingBulanan ? 'not-allowed' : 'pointer',
              opacity: loadingBulanan ? 0.7 : 1,
              fontSize: '14px'
            }}
          >
            {loadingBulanan ? 'Memuat...' : 'Tampilkan'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loadingBulanan ? (
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
            <Skeleton style={{ height: '220px', width: '100%' }} />
          </div>
        </div>
      ) : !bulananData || !bulananData.hari || bulananData.hari.length === 0 ? (
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
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px 0' }}>Data Laporan Bulanan Tidak Ditemukan</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, maxWidth: '480px', marginInline: 'auto' }}>
            Belum ada data penerima manfaat yang terdaftar pada bulan {namaBulanSelect} {tahun}.
          </p>
        </div>
      ) : (
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
                <Calendar size={20} />
                Rekapitulasi Harian Bulanan — {namaBulanSelect} {tahun}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Detail penerima manfaat per tanggal (13 Kategori)
              </span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Grand Total Penerima Manfaat: </span>
              <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>
                {(bulananData.total?.total || 0).toLocaleString('id-ID')}
              </strong>
            </div>
          </div>

          {/* Sub-card A: Peserta Didik */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              A. Peserta Didik (Pendidikan)
            </h4>
            <Table
              columns={columnsBulananPeserta}
              data={buildBulananPesertaRows()}
              emptyText="Tidak ada data peserta didik pada bulan ini."
            />
          </div>

          {/* Sub-card B: Non-Peserta Didik */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              B. Non-Peserta Didik (Posyandu)
            </h4>
            <Table
              columns={columnsBulananNonPeserta}
              data={buildBulananNonPesertaRows()}
              emptyText="Tidak ada data non-peserta pada bulan ini."
            />
          </div>
        </div>
      )}
    </>
  );
};
