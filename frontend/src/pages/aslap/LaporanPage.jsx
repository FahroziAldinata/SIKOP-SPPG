import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import Dropdown from '../../components/Dropdown';
import { Table } from '../../components/Table';
import { Skeleton } from '../../components/Skeleton';
import { Printer, RefreshCw, Filter, FileText, Layers, Users, School, Calendar, BookOpen } from 'lucide-react';

const REPORT_TYPE_OPTIONS = [
  { value: 'HARIAN', label: 'Laporan Harian' },
  { value: 'PERIODE', label: 'Laporan Per Periode' },
  { value: 'BULANAN', label: 'Laporan Bulanan' },
  { value: 'PER_KELAS', label: 'Laporan Per Kelas' }
];

const BULAN_OPTIONS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];

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

  // --- Render Helpers for PER_KELAS ---
  const totalSekolahCount = perKelasData.length;
  const totalKelasCount = perKelasData.reduce((acc, curr) => acc + (curr.totalKelas || 0), 0);
  const totalSiswaCount = perKelasData.reduce((acc, curr) => acc + (curr.totalJumlah || 0), 0);

  return (
    <div style={{ paddingBottom: '40px' }}>

      {/* Main Header / Report Type Selector Bar */}
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
            Laporan ASLAP
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Pilih jenis laporan untuk melihat dan mencetak rekapitulasi data penerima manfaat
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

      {/* ========================================================================= */}
      {/* SECTION 1: LAPORAN HARIAN */}
      {/* ========================================================================= */}
      {jenisLaporan === 'HARIAN' && (
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
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: LAPORAN PERIODE */}
      {/* ========================================================================= */}
      {jenisLaporan === 'PERIODE' && (
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
          ) : (<>
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
          </>)}
        </>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: LAPORAN BULANAN */}
      {/* ========================================================================= */}
      {jenisLaporan === 'BULANAN' && (
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
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: LAPORAN PER KELAS */}
      {/* ========================================================================= */}
      {jenisLaporan === 'PER_KELAS' && (
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
      )}

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
            zIndex: 10000
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
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{pdfModalTitle}</h3>
              <button
                onClick={() => {
                  setIsPdfModalOpen(false);
                  if (pdfUrl) {
                    URL.revokeObjectURL(pdfUrl);
                    setPdfUrl('');
                  }
                }}
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

            {/* Body */}
            <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} title="PDF Preview" />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsPdfModalOpen(false);
                  if (pdfUrl) {
                    URL.revokeObjectURL(pdfUrl);
                    setPdfUrl('');
                  }
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
