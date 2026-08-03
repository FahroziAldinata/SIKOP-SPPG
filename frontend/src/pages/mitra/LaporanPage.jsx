import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import Dropdown from '../../components/ui/Dropdown';
import { Table, renderDate } from '../../components/ui/Table';
import { Skeleton } from '../../components/ui/Skeleton';
import { Printer, RefreshCw, FileText, Filter } from 'lucide-react';

const REPORT_TYPE_OPTIONS = [
  { value: 'REALISASI_PO', label: 'Laporan Realisasi PO vs Pesanan' }
];

const formatRupiah = (val) => {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
  return `Rp ${Number(val).toLocaleString('id-ID')}`;
};

const renderStatusBadge = (status) => {
  switch (status) {
    case 'DIAJUKAN':
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(0, 123, 255, 0.12)',
          color: '#007bff',
          border: '1px solid rgba(0, 123, 255, 0.2)',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: '7px' }}>●</span>
          DIAJUKAN
        </span>
      );
    case 'DIREALISASI':
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(245, 158, 11, 0.13)',
          color: '#d97706',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: '7px' }}>●</span>
          DIREALISASI
        </span>
      );
    case 'DITERIMA':
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: '7px' }}>●</span>
          DITERIMA
        </span>
      );
    default:
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(100, 116, 139, 0.10)',
          color: 'var(--text-muted)',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: '7px' }}>●</span>
          {status || '—'}
        </span>
      );
  }
};

export const LaporanPage = () => {
  const { request } = useApi();
  const toast = useToast();

  const [jenisLaporan, setJenisLaporan] = useState('REALISASI_PO');

  // Master Data State (Periods)
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Data State
  const [loadingData, setLoadingData] = useState(false);
  const [reportData, setReportData] = useState(null);

  // PDF Preview State
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfModalTitle, setPdfModalTitle] = useState('Preview PDF Laporan');

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

  // Fetch Master Data (Periods)
  useEffect(() => {
    const fetchMasterData = async () => {
      setLoadingMaster(true);
      try {
        const res = await request('/aslap/periode');
        if (res.ok) {
          const data = await res.json();
          setPeriods(data);
          if (data.length > 0) {
            setSelectedPeriodId(data[0].id);
          }
        } else {
          toast.error('Gagal mengambil daftar periode');
        }
      } catch (error) {
        console.error('Error fetching master data:', error);
        toast.error('Terjadi kesalahan koneksi saat mengambil data periode');
      } finally {
        setLoadingMaster(false);
      }
    };

    fetchMasterData();
  }, []);

  // Fetch report data
  const fetchReportData = async (pId = selectedPeriodId) => {
    if (!pId) {
      toast.error('Pilih periode terlebih dahulu');
      return;
    }
    setLoadingData(true);
    try {
      const res = await request(`/mitra/laporan/realisasi-po?periodeId=${pId}`);
      if (res.ok) {
        const resJson = await res.json();
        setReportData(resJson.data || null);
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Gagal mengambil laporan realisasi PO');
        setReportData(null);
      }
    } catch (error) {
      console.error('Error fetching laporan realisasi PO:', error);
      toast.error('Terjadi kesalahan koneksi saat mengambil laporan');
      setReportData(null);
    } finally {
      setLoadingData(false);
    }
  };

  // Auto-fetch data on period or report type change
  useEffect(() => {
    if (!selectedPeriodId) return;
    if (jenisLaporan === 'REALISASI_PO') {
      fetchReportData(selectedPeriodId);
    }
  }, [selectedPeriodId, jenisLaporan]);

  // Print PDF Handler
  const handlePrintPdf = async () => {
    if (!selectedPeriodId) {
      toast.error('Pilih periode terlebih dahulu');
      return;
    }

    setPdfLoading(true);
    try {
      const res = await request(`/mitra/laporan/realisasi-po/pdf?periodeId=${selectedPeriodId}`);
      if (res.ok) {
        const blob = await res.blob();
        setPdfModalTitle('Preview PDF — Laporan Realisasi PO vs Pesanan');
        setPdfUrl(URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })));
        setIsPdfModalOpen(true);
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Gagal mengunduh PDF laporan');
      }
    } catch (error) {
      console.error('Error fetching PDF report:', error);
      toast.error('Terjadi kesalahan koneksi saat mengunduh PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const closePdfModal = () => {
    setIsPdfModalOpen(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }
  };

  const periodOptions = periods.map(p => ({
    value: p.id,
    label: `${p.nama || 'Periode'} (${p.tanggalMulai} - ${p.tanggalSelesai})`
  }));

  // Build Table Columns & Rows
  const columns = [
    { key: 'no', header: 'No', width: '50px', align: 'center' },
    { key: 'tanggal', header: 'Tanggal', width: '110px' },
    { key: 'noPo', header: 'No PO' },
    { key: 'supplier', header: 'Supplier' },
    { key: 'jumlahItem', header: 'Jumlah Item', align: 'right', width: '100px' },
    { key: 'qtyPesan', header: 'Qty Pesan', align: 'right', width: '100px' },
    { key: 'qtyRealisasi', header: 'Qty Realisasi', align: 'right', width: '110px' },
    { key: 'qtyDiterima', header: 'Qty Diterima', align: 'right', width: '110px' },
    { key: 'subtotalPesan', header: 'Subtotal Pesan', align: 'right', width: '140px' },
    { key: 'subtotalRealisasi', header: 'Subtotal Realisasi', align: 'right', width: '140px' },
    { key: 'status', header: 'Status', align: 'center', width: '130px' },
    { key: 'penerima', header: 'Penerima' },
    { key: 'waktuTerima', header: 'Waktu Terima', width: '140px' }
  ];

  const buildRows = () => {
    if (!reportData || !Array.isArray(reportData.poList)) return [];

    const rows = reportData.poList.map((po, idx) => ({
      id: po.id || idx,
      no: idx + 1,
      tanggal: renderDate(po.tanggal),
      noPo: <strong style={{ color: 'var(--text)' }}>{po.nomorPo || po.id || '—'}</strong>,
      supplier: po.supplier?.nama || '—',
      jumlahItem: (po.jumlahItem || 0).toLocaleString('id-ID'),
      qtyPesan: (po.totalPesan || 0).toLocaleString('id-ID'),
      qtyRealisasi: (po.totalRealisasi || 0).toLocaleString('id-ID'),
      qtyDiterima: (po.totalDiterima || 0).toLocaleString('id-ID'),
      subtotalPesan: formatRupiah(po.subtotalPesan),
      subtotalRealisasi: formatRupiah(po.subtotalRealisasi),
      status: renderStatusBadge(po.status),
      penerima: po.penerima || po.diterimaOleh?.nama || '—',
      waktuTerima: po.waktuTerima
        ? new Date(po.waktuTerima).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
        : '—'
    }));

    if (reportData.grandTotal) {
      const gt = reportData.grandTotal;
      rows.push({
        id: 'grand-total-row',
        no: '—',
        tanggal: (
          <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '13px' }}>
            GRAND TOTAL
          </span>
        ),
        noPo: '—',
        supplier: '—',
        jumlahItem: <strong>{(gt.jumlahItem || 0).toLocaleString('id-ID')}</strong>,
        qtyPesan: <strong>{(gt.totalPesan || 0).toLocaleString('id-ID')}</strong>,
        qtyRealisasi: <strong>{(gt.totalRealisasi || 0).toLocaleString('id-ID')}</strong>,
        qtyDiterima: <strong>{(gt.totalDiterima || 0).toLocaleString('id-ID')}</strong>,
        subtotalPesan: (
          <strong style={{ color: 'var(--color-primary)', fontSize: '14px' }}>
            {formatRupiah(gt.subtotalPesan)}
          </strong>
        ),
        subtotalRealisasi: (
          <strong style={{ color: 'var(--color-primary)', fontSize: '14px' }}>
            {formatRupiah(gt.subtotalRealisasi)}
          </strong>
        ),
        status: '—',
        penerima: '—',
        waktuTerima: '—'
      });
    }

    return rows;
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Report Type Selector Header */}
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
            Laporan Mitra
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Pilih jenis laporan untuk melihat dan mencetak rekapitulasi data realisasi PO
          </p>
        </div>

        <div style={{ minWidth: '260px' }}>
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

      {/* Filter & Action Section */}
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
            Laporan Realisasi PO vs Pesanan
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Rekapitulasi status dan jumlah realisasi pesanan PO per periode
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '260px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
              <Filter size={12} style={{ display: 'inline', marginRight: '4px' }} />
              PERIODE
            </label>
            {loadingMaster ? (
              <Skeleton height="38px" borderRadius="var(--radius-sm)" />
            ) : (
              <Dropdown
                options={periodOptions}
                value={selectedPeriodId}
                onChange={(val) => setSelectedPeriodId(val)}
              />
            )}
          </div>

          <button
            onClick={() => fetchReportData(selectedPeriodId)}
            disabled={loadingData || !selectedPeriodId}
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
              cursor: loadingData ? 'not-allowed' : 'pointer',
              opacity: loadingData ? 0.7 : 1
            }}
          >
            <RefreshCw size={16} className={loadingData ? 'spin' : ''} />
            <span>Tampilkan</span>
          </button>

          <button
            onClick={handlePrintPdf}
            disabled={pdfLoading || !selectedPeriodId || !reportData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              fontWeight: '700',
              cursor: (pdfLoading || !selectedPeriodId || !reportData) ? 'not-allowed' : 'pointer',
              opacity: (pdfLoading || !selectedPeriodId || !reportData) ? 0.6 : 1
            }}
          >
            <Printer size={16} />
            <span>{pdfLoading ? 'Menyiapkan PDF...' : 'Cetak PDF'}</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div>
        {loadingData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Skeleton height="40px" borderRadius="var(--radius-sm)" />
            <Skeleton height="50px" borderRadius="var(--radius-sm)" />
            <Skeleton height="50px" borderRadius="var(--radius-sm)" />
            <Skeleton height="50px" borderRadius="var(--radius-sm)" />
          </div>
        ) : (
          <Table
            columns={columns}
            data={buildRows()}
            emptyText="Belum ada data realisasi PO untuk periode ini"
          />
        )}
      </div>

      {/* PDF Preview Modal */}
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
            zIndex: 9999,
            padding: '20px'
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
              width: '90%',
              maxWidth: '1000px',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              padding: '20px',
              gap: '16px'
            }}
          >
            {/* Modal Header */}
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

            {/* Modal Body */}
            <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} title="PDF Preview" />
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={closePdfModal}
                style={{
                  padding: '8px 20px',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer'
                }}
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

export default LaporanPage;
