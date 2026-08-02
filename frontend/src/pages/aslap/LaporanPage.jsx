import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { ReportTypeSelector } from '../../components/aslap/laporan/ReportTypeSelector';
import { HarianReport } from '../../components/aslap/laporan/HarianReport';
import { PeriodeReport } from '../../components/aslap/laporan/PeriodeReport';
import { BulananReport } from '../../components/aslap/laporan/BulananReport';
import { PerKelasReport } from '../../components/aslap/laporan/PerKelasReport';
import { PdfPreviewModal } from '../../components/aslap/laporan/PdfPreviewModal';

export const LaporanPage = () => {
  const { request } = useApi();
  const toast = useToast();

  const [jenisLaporan, setJenisLaporan] = useState('HARIAN');

  // Master Data State (Periods & Schools)
  const [periods, setPeriods] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [loadingMaster, setLoadingMaster] = useState(true);

  // PDF Preview State
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfModalTitle, setPdfModalTitle] = useState('Preview PDF Laporan');

  // --- Laporan Harian State ---
  const [loadingHarian, setLoadingHarian] = useState(false);
  const [harianData, setHarianData] = useState(null);
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  // --- Laporan Periode State ---
  const [loadingPeriode, setLoadingPeriode] = useState(false);
  const [periodeData, setPeriodeData] = useState(null);

  // --- Laporan Bulanan State ---
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [loadingBulanan, setLoadingBulanan] = useState(false);
  const [bulananData, setBulananData] = useState(null);

  // --- Laporan Per Kelas State ---
  const [selectedSekolahId, setSelectedSekolahId] = useState('');
  const [loadingPerKelas, setLoadingPerKelas] = useState(false);
  const [perKelasData, setPerKelasData] = useState([]);

  // Fetch Master Data (Periode & Sekolah)
  useEffect(() => {
    const fetchMasterData = async () => {
      setLoadingMaster(true);
      try {
        const [resP, resS] = await Promise.all([
          request('/aslap/periode'),
          request('/aslap/sekolah')
        ]);

        if (resP.ok) {
          const dataP = await resP.json();
          setPeriods(dataP);
          if (dataP.length > 0) {
            setSelectedPeriodId(dataP[0].id);
          }
        } else {
          toast.error('Gagal mengambil daftar periode');
        }

        if (resS.ok) {
          const dataS = await resS.json();
          setSchools(dataS);
        }
      } catch (error) {
        console.error('Error fetching master data:', error);
        toast.error('Terjadi kesalahan koneksi saat mengambil data master');
      } finally {
        setLoadingMaster(false);
      }
    };

    fetchMasterData();
  }, []);

  // Fetchers for each report type
  const fetchHarian = async (pId = selectedPeriodId) => {
    if (!pId) {
      toast.error('Pilih periode terlebih dahulu');
      return;
    }
    setLoadingHarian(true);
    try {
      const res = await request(`/aslap/laporan/harian?periodeId=${pId}`);
      if (res.ok) {
        const resJson = await res.json();
        setHarianData(resJson.data || null);
        setActiveTabIdx(0);
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Gagal mengambil laporan harian');
        setHarianData(null);
      }
    } catch (error) {
      console.error('Error fetching laporan harian:', error);
      toast.error('Terjadi kesalahan koneksi saat mengambil laporan harian');
      setHarianData(null);
    } finally {
      setLoadingHarian(false);
    }
  };

  const fetchPeriode = async (pId = selectedPeriodId) => {
    if (!pId) {
      toast.error('Pilih periode terlebih dahulu');
      return;
    }
    setLoadingPeriode(true);
    try {
      const res = await request(`/aslap/laporan/periode?periodeId=${pId}`);
      if (res.ok) {
        const resJson = await res.json();
        setPeriodeData(resJson.data || null);
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Gagal mengambil laporan periode');
        setPeriodeData(null);
      }
    } catch (error) {
      console.error('Error fetching laporan periode:', error);
      toast.error('Terjadi kesalahan koneksi saat mengambil laporan periode');
      setPeriodeData(null);
    } finally {
      setLoadingPeriode(false);
    }
  };

  const fetchBulanan = async () => {
    if (!bulan || !tahun) {
      toast.error('Pilih bulan dan masukan tahun terlebih dahulu');
      return;
    }
    setLoadingBulanan(true);
    try {
      const res = await request(`/aslap/laporan/bulanan?bulan=${bulan}&tahun=${tahun}`);
      if (res.ok) {
        const resJson = await res.json();
        setBulananData(resJson.data || null);
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Gagal mengambil laporan bulanan');
        setBulananData(null);
      }
    } catch (error) {
      console.error('Error fetching laporan bulanan:', error);
      toast.error('Terjadi kesalahan koneksi saat mengambil laporan bulanan');
      setBulananData(null);
    } finally {
      setLoadingBulanan(false);
    }
  };

  const fetchPerKelas = async (pId = selectedPeriodId, sId = selectedSekolahId) => {
    if (!pId) return;
    setLoadingPerKelas(true);
    try {
      let url = `/aslap/laporan/per-kelas?periodeId=${pId}`;
      if (sId) {
        url += `&sekolahId=${sId}`;
      }
      const res = await request(url);
      if (res.ok) {
        const data = await res.json();
        setPerKelasData(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Gagal mengambil laporan per kelas');
        setPerKelasData([]);
      }
    } catch (error) {
      console.error('Error fetching laporan per kelas:', error);
      toast.error('Terjadi kesalahan jaringan saat mengambil data laporan');
      setPerKelasData([]);
    } finally {
      setLoadingPerKelas(false);
    }
  };

  // Auto-fetch data based on current report type and period selection
  useEffect(() => {
    if (!selectedPeriodId) return;
    if (jenisLaporan === 'HARIAN') {
      fetchHarian(selectedPeriodId);
    } else if (jenisLaporan === 'PERIODE') {
      fetchPeriode(selectedPeriodId);
    } else if (jenisLaporan === 'PER_KELAS') {
      fetchPerKelas(selectedPeriodId, selectedSekolahId);
    }
  }, [jenisLaporan, selectedPeriodId, selectedSekolahId]);

  useEffect(() => {
    if (jenisLaporan === 'BULANAN') {
      fetchBulanan();
    }
  }, [jenisLaporan]);

  const handlePrint = async () => {
    let endpoint = '';
    let title = 'Preview PDF Laporan';
    if (jenisLaporan === 'HARIAN') {
      if (!selectedPeriodId) {
        toast.error('Pilih periode terlebih dahulu');
        return;
      }
      endpoint = `/aslap/laporan/harian/pdf?periodeId=${selectedPeriodId}`;
      title = 'Preview PDF — Laporan Harian';
    } else if (jenisLaporan === 'PERIODE') {
      if (!selectedPeriodId) {
        toast.error('Pilih periode terlebih dahulu');
        return;
      }
      endpoint = `/aslap/laporan/periode/pdf?periodeId=${selectedPeriodId}`;
      title = 'Preview PDF — Laporan Per Periode';
    } else if (jenisLaporan === 'BULANAN') {
      if (!bulan || !tahun) {
        toast.error('Pilih bulan dan masukan tahun terlebih dahulu');
        return;
      }
      endpoint = `/aslap/laporan/bulanan/pdf?bulan=${bulan}&tahun=${tahun}`;
      title = 'Preview PDF — Laporan Bulanan';
    } else if (jenisLaporan === 'PER_KELAS') {
      if (!selectedPeriodId) {
        toast.error('Pilih periode terlebih dahulu');
        return;
      }
      endpoint = `/aslap/laporan/per-kelas/pdf?periodeId=${selectedPeriodId}`;
      if (selectedSekolahId) {
        endpoint += `&sekolahId=${selectedSekolahId}`;
      }
      title = 'Preview PDF — Laporan Per Kelas';
    } else {
      return;
    }

    setPdfLoading(true);
    try {
      const res = await request(endpoint);
      if (res.ok) {
        const blob = await res.blob();
        setPdfModalTitle(title);
        setPdfUrl(URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })));
        setIsPdfModalOpen(true);
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Gagal mengunduh laporan PDF');
      }
    } catch (error) {
      console.error('Error fetching PDF report:', error);
      toast.error('Terjadi kesalahan koneksi saat mengunduh PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const periodOptions = periods.map(p => ({
    value: p.id,
    label: `${p.nama || 'Periode'} (${p.tanggalMulai} - ${p.tanggalSelesai})`
  }));

  const schoolOptions = [
    { value: '', label: 'Semua Sekolah' },
    ...schools.map(s => ({
      value: s.id,
      label: s.nama
    }))
  ];

  const selectedPeriodObj = periods.find(p => p.id === selectedPeriodId);

  return (
    <div style={{ paddingBottom: '40px' }}>
      <ReportTypeSelector
        jenisLaporan={jenisLaporan}
        setJenisLaporan={setJenisLaporan}
      />

      <HarianReport
        jenisLaporan={jenisLaporan}
        loadingMaster={loadingMaster}
        periodOptions={periodOptions}
        selectedPeriodId={selectedPeriodId}
        setSelectedPeriodId={setSelectedPeriodId}
        loadingHarian={loadingHarian}
        fetchHarian={fetchHarian}
        handlePrint={handlePrint}
        harianData={harianData}
        activeTabIdx={activeTabIdx}
        setActiveTabIdx={setActiveTabIdx}
      />

      <PeriodeReport
        jenisLaporan={jenisLaporan}
        loadingMaster={loadingMaster}
        periodOptions={periodOptions}
        selectedPeriodId={selectedPeriodId}
        setSelectedPeriodId={setSelectedPeriodId}
        loadingPeriode={loadingPeriode}
        fetchPeriode={fetchPeriode}
        handlePrint={handlePrint}
        periodeData={periodeData}
      />

      <BulananReport
        jenisLaporan={jenisLaporan}
        loadingMaster={loadingMaster}
        bulan={bulan}
        tahun={tahun}
        setBulan={setBulan}
        setTahun={setTahun}
        loadingBulanan={loadingBulanan}
        fetchBulanan={fetchBulanan}
        handlePrint={handlePrint}
        bulananData={bulananData}
      />

      <PerKelasReport
        jenisLaporan={jenisLaporan}
        loadingMaster={loadingMaster}
        periodOptions={periodOptions}
        schoolOptions={schoolOptions}
        selectedPeriodId={selectedPeriodId}
        selectedSekolahId={selectedSekolahId}
        setSelectedPeriodId={setSelectedPeriodId}
        setSelectedSekolahId={setSelectedSekolahId}
        loadingPerKelas={loadingPerKelas}
        fetchPerKelas={fetchPerKelas}
        handlePrint={handlePrint}
        perKelasData={perKelasData}
      />

      <PdfPreviewModal
        isPdfModalOpen={isPdfModalOpen}
        pdfModalTitle={pdfModalTitle}
        pdfUrl={pdfUrl}
        setIsPdfModalOpen={setIsPdfModalOpen}
        setPdfUrl={setPdfUrl}
      />
    </div>
  );
};

export default LaporanPage;
