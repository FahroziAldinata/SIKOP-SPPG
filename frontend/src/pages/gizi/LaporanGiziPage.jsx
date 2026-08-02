import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { RefreshCw } from 'lucide-react';
import ReportHeader, { REPORT_TYPE_OPTIONS } from '../../components/gizi/laporan/ReportHeader';
import PeriodeFilter from '../../components/gizi/laporan/PeriodeFilter';
import HariFilter from '../../components/gizi/laporan/HariFilter';
import ReportActionButtons from '../../components/gizi/laporan/ReportActionButtons';
import PemenuhanReport from '../../components/gizi/laporan/PemenuhanReport';
import RekapMenuReport from '../../components/gizi/laporan/RekapMenuReport';
import OrganoleptikReport from '../../components/gizi/laporan/OrganoleptikReport';
import PdfPreviewModal from '../../components/gizi/laporan/PdfPreviewModal';

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
      <ReportHeader
        jenisLaporan={jenisLaporan}
        setJenisLaporan={setJenisLaporan}
        REPORT_TYPE_OPTIONS={REPORT_TYPE_OPTIONS}
      />

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
        <PeriodeFilter
          showCalendar={showCalendar}
          setShowCalendar={setShowCalendar}
          selectedRange={selectedRange}
          setSelectedRange={setSelectedRange}
          setTanggalMulai={setTanggalMulai}
          setTanggalSelesai={setTanggalSelesai}
          calendarDateToString={calendarDateToString}
          calendarRef={calendarRef}
          tanggalMulai={tanggalMulai}
          tanggalSelesai={tanggalSelesai}
        />

        <HariFilter
          showHariPopup={showHariPopup}
          setShowHariPopup={setShowHariPopup}
          monthView={monthView}
          setMonthView={setMonthView}
          selectedDates={selectedDates}
          setSelectedDates={setSelectedDates}
          hariRef={hariRef}
        />

        <ReportActionButtons
          blokOptions={blokOptions}
          blokKode={blokKode}
          setBlokKode={setBlokKode}
          loading={loading}
          handleTampilkan={handleTampilkan}
          handlePrint={handlePrint}
          isDataEmpty={isDataEmpty}
          pdfLoading={pdfLoading}
        />
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
            <PemenuhanReport
              loading={loading}
              data={data}
              columnsGizi={columnsGizi}
            />
          )}

          {jenisLaporan === 'REKAP_MENU' && (
            <RekapMenuReport
              loading={loading}
              data={data}
              columnsRekap={columnsRekap}
            />
          )}

          {jenisLaporan === 'ORGANOLEPTIK' && (
            <OrganoleptikReport
              loading={loading}
              data={data}
              columnsOrganoleptik={columnsOrganoleptik}
              columnsAlergi={columnsAlergi}
            />
          )}
        </>
      )}

      {/* Modal PDF Preview */}
      <PdfPreviewModal
        isPdfModalOpen={isPdfModalOpen}
        pdfModalTitle={pdfModalTitle}
        pdfUrl={pdfUrl}
        closePdfModal={closePdfModal}
      />
    </div>
  );
};

export default LaporanGiziPage;
