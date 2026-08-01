import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import Dropdown from '../../components/Dropdown';
import { Table } from '../../components/Table';
import { StatusBadge } from '../../components/StatusBadge';
import { FileText, Printer, Search, RefreshCw, Calendar, CalendarDays } from 'lucide-react';
import { RangeCalendar } from "@heroui/react";

const REPORT_TYPE_OPTIONS = [
  { value: 'PEMENUHAN', label: 'Laporan Pemenuhan Gizi' },
  { value: 'REKAP_MENU', label: 'Laporan Rekap Menu' },
  { value: 'ORGANOLEPTIK', label: 'Laporan Uji Organoleptik & Alergi' }
];

export const LaporanGiziPage = () => {
  const { request } = useApi();
  const toast = useToast();

  const [jenisLaporan, setJenisLaporan] = useState('PEMENUHAN');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);       // array 'YYYY-MM-DD'
  const [showHariPopup, setShowHariPopup] = useState(false);
  const [monthView, setMonthView] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [blokKode, setBlokKode] = useState('SEMUA');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [blokOptions, setBlokOptions] = useState([
    { value: 'SEMUA', label: 'SEMUA' }
  ]);

  const calendarRef = useRef(null);
  const hariRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
      if (hariRef.current && !hariRef.current.contains(event.target)) {
        setShowHariPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const calendarDateToString = (date) => {
    if (!date) return "";
    return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
  };

  // PDF Preview State
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfModalTitle, setPdfModalTitle] = useState('Preview PDF — Laporan Pemenuhan Gizi');

  // Revoke ObjectURL after modal closes or after 30s
  useEffect(() => {
    if (!pdfUrl) return;
    const timer = setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 30000);
    return () => {
      clearTimeout(timer);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const closePdfModal = () => {
    setIsPdfModalOpen(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }
  };

  // Fetch Options for Blok Dropdown on mount
  useEffect(() => {
    const fetchKelompokUmur = async () => {
      try {
        const res = await request('/gizi/kelompok-umur-menu');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const opts = [
              { value: 'SEMUA', label: 'SEMUA' },
              ...list.map(k => ({ value: k.kode, label: k.nama || k.kode }))
            ];
            setBlokOptions(opts);
          } else {
            setBlokOptions([
              { value: 'SEMUA', label: 'SEMUA' },
              { value: 'KECIL', label: 'KECIL' },
              { value: 'BESAR', label: 'BESAR' },
              { value: 'TIGA_B', label: 'TIGA_B' }
            ]);
          }
        } else {
          setBlokOptions([
            { value: 'SEMUA', label: 'SEMUA' },
            { value: 'KECIL', label: 'KECIL' },
            { value: 'BESAR', label: 'BESAR' },
            { value: 'TIGA_B', label: 'TIGA_B' }
          ]);
        }
      } catch (err) {
        console.error('Error fetching kelompok-umur-menu:', err);
        setBlokOptions([
          { value: 'SEMUA', label: 'SEMUA' },
          { value: 'KECIL', label: 'KECIL' },
          { value: 'BESAR', label: 'BESAR' },
          { value: 'TIGA_B', label: 'TIGA_B' }
        ]);
      }
    };
    fetchKelompokUmur();
  }, []);

  const buildQuery = (baseEndpoint) => {
    const params = new URLSearchParams();
    if (selectedDates.length > 0) {
      selectedDates.forEach(d => params.append('tanggal', d));
    } else {
      params.append('tanggalMulai', tanggalMulai);
      params.append('tanggalSelesai', tanggalSelesai);
    }
    if (blokKode && blokKode !== 'SEMUA') params.append('blokKode', blokKode);
    return `${baseEndpoint}?${params.toString()}`;
  };

  const handleTampilkan = async () => {
    if (selectedDates.length === 0 && (!tanggalMulai || !tanggalSelesai)) {
      toast.error('Pilih hari tertentu atau periode tanggal');
      return;
    }
    setLoading(true);
    try {
      let endpoint = '/gizi/laporan/pemenuhan-gizi';
      if (jenisLaporan === 'REKAP_MENU') {
        endpoint = '/gizi/laporan/rekap-menu';
      } else if (jenisLaporan === 'ORGANOLEPTIK') {
        endpoint = '/gizi/laporan/organoleptik';
      }

      const url = buildQuery(endpoint);
      const res = await request(url);
      if (res.ok) {
        const resJson = await res.json();
        setData(resJson.data || []);
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Gagal mengambil laporan');
        setData(null);
      }
    } catch (error) {
      console.error('Error fetching laporan:', error);
      toast.error('Terjadi kesalahan koneksi saat mengambil laporan');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (selectedDates.length === 0 && (!tanggalMulai || !tanggalSelesai)) {
      toast.error('Pilih hari tertentu atau periode tanggal');
      return;
    }

    let endpoint = '/gizi/laporan/pemenuhan-gizi/pdf';
    let modalTitle = 'Preview PDF — Laporan Pemenuhan Gizi';
    if (jenisLaporan === 'REKAP_MENU') {
      endpoint = '/gizi/laporan/rekap-menu/pdf';
      modalTitle = 'Preview PDF — Laporan Rekap Menu';
    } else if (jenisLaporan === 'ORGANOLEPTIK') {
      endpoint = '/gizi/laporan/organoleptik/pdf';
      modalTitle = 'Preview PDF — Laporan Uji Organoleptik & Alergi';
    }

    const url = buildQuery(endpoint);

    setPdfLoading(true);
    try {
      const res = await request(url);
      if (res.ok) {
        const blob = await res.blob();
        setPdfModalTitle(modalTitle);
        setPdfUrl(URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })));
        setIsPdfModalOpen(true);
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Gagal mengunduh PDF Laporan');
      }
    } catch (error) {
      console.error('Error fetching PDF report:', error);
      toast.error('Terjadi kesalahan koneksi saat mengunduh PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const columnsGizi = [
    {
      key: 'zatGizi',
      header: 'Zat Gizi',
      align: 'left',
      render: (_, row) => `${row.label}${row.satuan ? ` (${row.satuan})` : ''}`
    },
    {
      key: 'target',
      header: 'Target',
      align: 'center',
      render: (val) => Number(val || 0).toLocaleString('id-ID')
    },
    {
      key: 'realisasi',
      header: 'Realisasi',
      align: 'center',
      render: (val) => Number(val || 0).toLocaleString('id-ID')
    },
    {
      key: 'pemenuhan',
      header: 'Pemenuhan (%)',
      align: 'center',
      render: (_, row) => {
        const p = Number(row.persen || 0);
        let color = 'var(--color-danger)';
        if (p >= 90) color = 'var(--color-success)';
        else if (p >= 60) color = '#d97706';
        return <span style={{ color, fontWeight: 700 }}>{p}%</span>;
      }
    },
    {
      key: 'statusGizi',
      header: 'Status',
      align: 'center',
      render: (_, row) => {
        const p = Number(row.persen || 0);
        let text = 'Kurang';
        let color = 'var(--color-danger)';
        if (p >= 90) {
          text = 'Terpenuhi';
          color = 'var(--color-success)';
        } else if (p >= 60) {
          text = 'Cukup';
          color = '#d97706';
        }
        return <span style={{ color, fontWeight: 700 }}>{text}</span>;
      }
    }
  ];

  const columnsRekap = [
    {
      key: 'komponen',
      header: 'Komponen',
      align: 'left',
      render: (val) => val || '—'
    },
    {
      key: 'namaMenu',
      header: 'Nama Menu',
      align: 'left',
      render: (val) => val || '—'
    },
    {
      key: 'bahan',
      header: 'Bahan Pokok',
      align: 'left',
      render: (val) => val || '—'
    },
    {
      key: 'beratBersihGr',
      header: 'Berat Bersih (g)',
      align: 'center',
      render: (val) => {
        const num = Number(val || 0);
        return Number.isInteger(num) ? num.toLocaleString('id-ID') : num.toLocaleString('id-ID', { maximumFractionDigits: 2 });
      }
    },
    {
      key: 'beratURT',
      header: 'URT',
      align: 'left',
      render: (val) => val || '—'
    }
  ];

  const columnsOrganoleptik = [
    {
      key: 'rasa',
      header: 'Rasa',
      align: 'center',
      render: (val) => val || '—'
    },
    {
      key: 'aroma',
      header: 'Aroma',
      align: 'center',
      render: (val) => val || '—'
    },
    {
      key: 'tekstur',
      header: 'Tekstur',
      align: 'center',
      render: (val) => val || '—'
    },
    {
      key: 'suhuSaji',
      header: 'Suhu Saji',
      align: 'center',
      render: (val) => val || '—'
    },
    {
      key: 'ujiPadaTanggal',
      header: 'Uji Pada Tanggal',
      align: 'center',
      render: (val) => val || '—'
    },
    {
      key: 'jumlahOmpreng',
      header: 'Jumlah Ompreng',
      align: 'center',
      render: (val) => val != null ? val : '—'
    },
    {
      key: 'tanggalMusnah',
      header: 'Tanggal Musnah',
      align: 'center',
      render: (val) => val || '—'
    }
  ];

  const columnsAlergi = [
    {
      key: 'jenisAlergi',
      header: 'Jenis Alergi',
      align: 'center',
      render: (val) => val || '—'
    },
    {
      key: 'jumlahSiswa',
      header: 'Jumlah Siswa',
      align: 'center',
      render: (val) => val != null ? val : 0
    },
    {
      key: 'bahanPengganti',
      header: 'Bahan Pengganti',
      align: 'center',
      render: (val) => val || '—'
    }
  ];

  const isDataEmpty = !data || data.length === 0;


  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header Halaman */}
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
            options={REPORT_TYPE_OPTIONS}
            value={jenisLaporan}
            onChange={(val) => setJenisLaporan(val)}
          />
        </div>
      </div>

      {/* Filter Bar */}
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
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div ref={calendarRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
            PERIODE TANGGAL
          </label>
          <button
            type="button"
            onClick={() => setShowCalendar(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: (!tanggalMulai && !tanggalSelesai) ? 'var(--text-muted)' : 'var(--text)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              minWidth: '220px',
              justifyContent: 'flex-start'
            }}
          >
            <Calendar size={16} color="var(--text-muted)" />
            <span>
              {!tanggalMulai && !tanggalSelesai
                ? 'Pilih Tanggal...'
                : tanggalMulai === tanggalSelesai
                ? tanggalMulai
                : `${tanggalMulai} s.d. ${tanggalSelesai}`}
            </span>
          </button>

          {showCalendar && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 1000,
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-hover)',
                padding: '12px'
              }}
            >
              <RangeCalendar
                aria-label="Rentang Periode"
                value={selectedRange}
                onChange={(range) => {
                  if (!range?.start || !range?.end) return;
                  setSelectedRange(range);
                  setTanggalMulai(calendarDateToString(range.start));
                  setTanggalSelesai(calendarDateToString(range.end));
                  setShowCalendar(false);
                }}
              >
                <RangeCalendar.Header>
                  <RangeCalendar.NavButton slot="previous" />
                  <RangeCalendar.Heading />
                  <RangeCalendar.NavButton slot="next" />
                </RangeCalendar.Header>

                <RangeCalendar.Grid>
                  <RangeCalendar.GridHeader>
                    {(day) => (
                      <RangeCalendar.HeaderCell>
                        {day}
                      </RangeCalendar.HeaderCell>
                    )}
                  </RangeCalendar.GridHeader>

                  <RangeCalendar.GridBody>
                    {(date) => (
                      <RangeCalendar.Cell date={date} />
                    )}
                  </RangeCalendar.GridBody>
                </RangeCalendar.Grid>
              </RangeCalendar>
            </div>
          )}
        </div>

        <div ref={hariRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
            PILIH HARI
          </label>
          <button
            type="button"
            onClick={() => setShowHariPopup(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: selectedDates.length === 0 ? 'var(--text-muted)' : 'var(--text)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              minWidth: '220px',
              justifyContent: 'flex-start'
            }}
          >
            <CalendarDays size={16} color="var(--text-muted)" />
            <span>
              {selectedDates.length === 0
                ? 'Pilih Hari...'
                : selectedDates.length === 1
                ? selectedDates[0]
                : `${selectedDates.length} hari terpilih`}
            </span>
          </button>

          {showHariPopup && (() => {
            const daysInMonth = new Date(monthView.y, monthView.m + 1, 0).getDate();
            const firstDayIndex = (new Date(monthView.y, monthView.m, 1).getDay() + 6) % 7;
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            return (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 1000,
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-hover)',
                  padding: '16px',
                  minWidth: '290px'
                }}
              >
                {/* Header Navigasi Bulan */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setMonthView(prev => prev.m === 0 ? { y: prev.y - 1, m: 11 } : { y: prev.y, m: prev.m - 1 })}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', padding: '2px 8px' }}
                  >
                    ‹
                  </button>
                  <span style={{ fontWeight: '700', fontSize: '14px', textTransform: 'capitalize' }}>
                    {new Date(monthView.y, monthView.m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMonthView(prev => prev.m === 11 ? { y: prev.y + 1, m: 0 } : { y: prev.y, m: prev.m + 1 })}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', padding: '2px 8px' }}
                  >
                    ›
                  </button>
                </div>

                {/* Grid Hari Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
                  {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                    <div key={day} style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grid Hari Cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: '4px' }}>
                  {Array.from({ length: firstDayIndex }).map((_, idx) => (
                    <div key={`empty-${idx}`} style={{ width: '36px', height: '36px' }} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dateStr = `${monthView.y}-${String(monthView.m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isSelected = selectedDates.includes(dateStr);
                    const isToday = dateStr === todayStr;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDates(prev =>
                            prev.includes(dateStr)
                              ? prev.filter(d => d !== dateStr)
                              : [...prev, dateStr].sort()
                          );
                        }}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: isToday && !isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                          backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                          color: isSelected ? '#fff' : 'var(--text)',
                          fontWeight: isSelected || isToday ? '700' : '400',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Chips */}
                {selectedDates.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', maxWidth: '276px' }}>
                    {selectedDates.map(d => {
                      const parts = d.split('-');
                      const formatted = `${parts[2]}/${parts[1]}`;
                      return (
                        <span
                          key={d}
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            color: '#fff',
                            borderRadius: '999px',
                            padding: '2px 10px',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {formatted}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDates(prev => prev.filter(x => x !== d));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '14px',
                              lineHeight: 1,
                              padding: 0,
                              marginLeft: '2px'
                            }}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedDates([])}
                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: 'var(--radius-sm)' }}
                  >
                    Bersihkan
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

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
      </div>

      {/* Konten / Card per tanggal & blok */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw className="animate-spin" size={24} style={{ marginBottom: '8px' }} />
          <div>Memuat data laporan pemenuhan gizi...</div>
        </div>
      ) : data === null ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-elevated)'
        }}>
          Pilih rentang tanggal dan klik Tampilkan
        </div>
      ) : data.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-elevated)'
        }}>
          Tidak ada data
        </div>
      ) : (
        <>
          {jenisLaporan === 'PEMENUHAN' && (
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
          )}

          {jenisLaporan === 'REKAP_MENU' && (
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

                      {/* Tabel Rekap Menu */}
                      <Table columns={columnsRekap} data={b.rows || []} emptyText="Tidak ada data rekap menu" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {jenisLaporan === 'ORGANOLEPTIK' && (
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
          )}
        </>
      )}

      {/* Modal PDF Preview */}
      {isPdfModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePdfModal();
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              width: '85%',
              maxWidth: '1000px',
              height: '85vh',
              boxShadow: 'var(--shadow-hover)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{pdfModalTitle}</h3>
              <button
                onClick={closePdfModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                &times;
              </button>
            </div>

            {/* Body Modal */}
            <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} title="PDF Preview" />
            </div>

            {/* Footer Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={closePdfModal}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaporanGiziPage;
