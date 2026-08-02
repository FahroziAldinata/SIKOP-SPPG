import React from 'react';
import Dropdown from '../../Dropdown';
import { Table } from '../../Table';
import { Skeleton } from '../../Skeleton';
import { Printer, RefreshCw, Filter, FileText, Layers, Users, School } from 'lucide-react';

export const HarianReport = ({
  jenisLaporan,
  loadingMaster,
  periodOptions,
  selectedPeriodId,
  setSelectedPeriodId,
  loadingHarian,
  fetchHarian,
  handlePrint,
  harianData,
  activeTabIdx,
  setActiveTabIdx
}) => {
  if (jenisLaporan !== 'HARIAN') return null;

  // --- Render Helpers for HARIAN ---
  const grupHariListHarian = harianData?.grupHari || [];
  const currentGrupHarian = grupHariListHarian[activeTabIdx] || null;

  const columnsHarianA = [
    { key: 'kelompok', header: 'Kelompok' },
    { key: 'sekolah', header: 'Sekolah' },
    { key: 'l', header: 'L', align: 'right', width: '90px' },
    { key: 'p', header: 'P', align: 'right', width: '90px' },
    { key: 'total', header: 'Total', align: 'right', width: '120px' },
    { key: 'lkPic', header: 'LK PIC', align: 'right', width: '80px' },
    { key: 'pPic', header: 'P PIC', align: 'right', width: '80px' },
    { key: 'jmlPic', header: 'JML PIC', align: 'right', width: '90px' },
  ];

  const buildRowsHarianA = () => {
    if (!currentGrupHarian || !currentGrupHarian.sesiA || !currentGrupHarian.sesiA.sekolah) return [];
    const rows = [];
    currentGrupHarian.sesiA.sekolah.forEach((sek, sekIdx) => {
      let subL = 0;
      let subP = 0;
      sek.kategori.forEach((kat, katIdx) => {
        subL += kat.l;
        subP += kat.p;
        rows.push({
          id: `a-${sek.id}-${kat.kode}-${katIdx}`,
          kelompok: kat.nama,
          sekolah: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{sek.nama}</span>
              {sek.jenjang && sek.jenjang !== '-' && (
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: '700',
                  backgroundColor: 'rgba(7, 30, 73, 0.08)',
                  color: 'var(--color-primary)'
                }}>
                  {sek.jenjang}
                </span>
              )}
            </div>
          ),
          l: kat.l.toLocaleString('id-ID'),
          p: kat.p.toLocaleString('id-ID'),
          total: (
            <span style={{ fontWeight: 600 }}>
              {kat.total.toLocaleString('id-ID')}
            </span>
          ),
          lkPic: '—',
          pPic: '—',
          jmlPic: '—',
        });
      });
      rows.push({
        id: `sub-a-${sek.id}-${sekIdx}`,
        kelompok: <span style={{ fontWeight: 700, color: 'var(--text)' }}>Subtotal {sek.nama}</span>,
        sekolah: <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>,
        l: <span style={{ fontWeight: 700 }}>{subL.toLocaleString('id-ID')}</span>,
        p: <span style={{ fontWeight: 700 }}>{subP.toLocaleString('id-ID')}</span>,
        total: (
          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
            {sek.total.toLocaleString('id-ID')}
          </span>
        ),
        lkPic: <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{(sek.lkPic || 0).toLocaleString('id-ID')}</span>,
        pPic: <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{(sek.pPic || 0).toLocaleString('id-ID')}</span>,
        jmlPic: <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{(sek.jmlPic || 0).toLocaleString('id-ID')}</span>,
      });
    });

    if (currentGrupHarian.sesiA.sekolah.length > 0) {
      const grandTotal = currentGrupHarian.sesiA.grandTotal || 0;
      rows.push({
        id: `grand-a-${currentGrupHarian.id}`,
        kelompok: (
          <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '14px' }}>
            GRAND TOTAL PESERTA DIDIK
          </span>
        ),
        sekolah: <span style={{ color: 'var(--text-muted)' }}>—</span>,
        l: '—',
        p: '—',
        total: (
          <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '16px' }}>
            {grandTotal.toLocaleString('id-ID')}
          </span>
        ),
        lkPic: '—',
        pPic: '—',
        jmlPic: '—',
      });
    }
    return rows;
  };

  const columnsHarianB = [
    { key: 'kelompok', header: 'Kelompok' },
    { key: 'posyandu', header: 'Posyandu' },
    { key: 'l', header: 'L', align: 'right', width: '90px' },
    { key: 'p', header: 'P', align: 'right', width: '90px' },
    { key: 'total', header: 'Total', align: 'right', width: '120px' },
    { key: 'picKader', header: 'PIC KADER', align: 'right', width: '100px' },
  ];

  const buildRowsHarianB = () => {
    if (!currentGrupHarian || !currentGrupHarian.sesiB || !currentGrupHarian.sesiB.posyandu) return [];
    const rows = [];
    currentGrupHarian.sesiB.posyandu.forEach((pos, posIdx) => {
      let subL = 0;
      let subP = 0;
      pos.kategori.forEach((kat, katIdx) => {
        subL += kat.l;
        subP += kat.p;

        const isKader = kat.kode === 'KADER_POSYANDU' || (kat.nama && kat.nama.toLowerCase().includes('kader'));
        let displayL = kat.l.toLocaleString('id-ID');
        let displayP = kat.p.toLocaleString('id-ID');

        if (isKader && kat.l === 0) {
          displayL = '-';
        }

        rows.push({
          id: `b-${pos.id}-${kat.kode}-${katIdx}`,
          kelompok: kat.nama,
          posyandu: pos.nama,
          l: displayL,
          p: displayP,
          total: (
            <span style={{ fontWeight: 600 }}>
              {kat.total.toLocaleString('id-ID')}
            </span>
          ),
          picKader: '—',
        });
      });
      rows.push({
        id: `sub-b-${pos.id}-${posIdx}`,
        kelompok: <span style={{ fontWeight: 700, color: 'var(--text)' }}>Subtotal {pos.nama}</span>,
        posyandu: <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>,
        l: <span style={{ fontWeight: 700 }}>{subL.toLocaleString('id-ID')}</span>,
        p: <span style={{ fontWeight: 700 }}>{subP.toLocaleString('id-ID')}</span>,
        total: (
          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
            {pos.total.toLocaleString('id-ID')}
          </span>
        ),
        picKader: <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{(pos.picKader || 0).toLocaleString('id-ID')}</span>,
      });
    });

    if (currentGrupHarian.sesiB.posyandu.length > 0) {
      const grandTotal = currentGrupHarian.sesiB.grandTotal || 0;
      rows.push({
        id: `grand-b-${currentGrupHarian.id}`,
        kelompok: (
          <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '14px' }}>
            GRAND TOTAL NON-PESERTA DIDIK
          </span>
        ),
        posyandu: <span style={{ color: 'var(--text-muted)' }}>—</span>,
        l: '—',
        p: '—',
        total: (
          <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '16px' }}>
            {grandTotal.toLocaleString('id-ID')}
          </span>
        ),
        picKader: '—',
      });
    }
    return rows;
  };

  return (
    <>
      {/* Header Action Section */}
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
            Laporan Harian Aslap
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Rekapitulasi harian penerima manfaat per grup hari (Peserta Didik &amp; Non-Peserta Didik)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => fetchHarian()}
            disabled={loadingHarian}
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
            <RefreshCw size={16} className={loadingHarian ? 'spin' : ''} />
            Tampilkan Laporan
          </button>

          <button
            onClick={handlePrint}
            disabled={loadingHarian || !harianData || grupHariListHarian.length === 0}
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
              cursor: (loadingHarian || !harianData || grupHariListHarian.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (loadingHarian || !harianData || grupHariListHarian.length === 0) ? 0.6 : 1,
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
              onClick={() => fetchHarian()}
              disabled={loadingHarian}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                fontWeight: '700',
                cursor: loadingHarian ? 'not-allowed' : 'pointer',
                opacity: loadingHarian ? 0.7 : 1,
                fontSize: '14px'
              }}
            >
              {loadingHarian ? 'Memuat...' : 'Tampilkan'}
            </button>
          </div>
        )}
      </div>

      {/* Main Content / Tab Section */}
      {loadingHarian ? (
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
      ) : !harianData || grupHariListHarian.length === 0 ? (
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
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px 0' }}>Data Laporan Harian Tidak Ditemukan</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, maxWidth: '480px', marginInline: 'auto' }}>
            Belum ada grup hari atau data penerima manfaat yang terdaftar pada periode ini.
          </p>
        </div>
      ) : (
        <div>
          {/* Tabs for GrupHari */}
          <div
            className="no-print"
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px',
              borderBottom: '2px solid var(--border)',
              paddingBottom: '2px',
              overflowX: 'auto'
            }}
          >
            {grupHariListHarian.map((gh, idx) => {
              const active = idx === activeTabIdx;
              return (
                <button
                  key={gh.id || idx}
                  onClick={() => setActiveTabIdx(idx)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                    border: 'none',
                    borderBottom: active ? '3px solid var(--color-primary)' : '3px solid transparent',
                    backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
                    color: active ? 'var(--color-primary)' : 'var(--text-muted)',
                    fontWeight: active ? '700' : '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Layers size={16} />
                  <span>{gh.label}</span>
                  {Array.isArray(gh.hariAktif) && gh.hariAktif.length > 0 && (
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>
                      ({gh.hariAktif.join(', ')})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {currentGrupHarian && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {/* Section A: PESERTA DIDIK */}
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
                      Section A: Peserta Didik ({currentGrupHarian.label})
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Penerima manfaat kategori peserta didik (dikelompokkan per sekolah)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Grand Total Sesi A: </span>
                    <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>
                      {(currentGrupHarian.sesiA?.grandTotal || 0).toLocaleString('id-ID')}
                    </strong>
                  </div>
                </div>

                <Table
                  columns={columnsHarianA}
                  data={buildRowsHarianA()}
                  emptyText="Tidak ada data penerima manfaat peserta didik pada grup hari ini."
                />
              </div>
            </div>
          )}

          {/* Section B: NON-PESERTA DIDIK (1 Blok Seluruh Periode) */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            padding: '24px',
            marginTop: '30px'
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
                  Section B: Non-Peserta Didik (B3)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Penerima manfaat kategori non-peserta didik (dikelompokkan per posyandu - 1 blok untuk semua hari)
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Grand Total Sesi B: </span>
                <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>
                  {((harianData?.sesiB || currentGrupHarian?.sesiB)?.grandTotal || 0).toLocaleString('id-ID')}
                </strong>
              </div>
            </div>

            <Table
              columns={columnsHarianB}
              data={buildRowsHarianB()}
              emptyText="Tidak ada data penerima manfaat non-peserta didik pada periode ini."
            />
          </div>
        </div>
      )}
    </>
  );
};
