import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ReportFilterBar } from '../../../components/akuntan/laporan/ReportFilterBar';
import { ReportActionButtons } from '../../../components/akuntan/laporan/ReportActionButtons';
import { BkuTable } from '../../../components/akuntan/laporan/BkuTable';
import { BpTable } from '../../../components/akuntan/laporan/BpTable';
import { NeracaSaldoTable } from '../../../components/akuntan/laporan/NeracaSaldoTable';
import { StockBarangTable } from '../../../components/akuntan/laporan/StockBarangTable';
import { KebutuhanBelanjaTable } from '../../../components/akuntan/laporan/KebutuhanBelanjaTable';
import { PerPeriodeTable } from '../../../components/akuntan/laporan/PerPeriodeTable';
import { PerBulanTable } from '../../../components/akuntan/laporan/PerBulanTable';
import { LaporanHarianSection } from '../../../components/akuntan/laporan/LaporanHarianSection';
import { LraTable } from '../../../components/akuntan/laporan/LraTable';
import { Lpd2mBuktiSection } from '../../../components/akuntan/laporan/Lpd2mBuktiSection';
import { Lpd2mTable } from '../../../components/akuntan/laporan/Lpd2mTable';
import { BttSection } from '../../../components/akuntan/laporan/BttSection';
import { BapsdSection } from '../../../components/akuntan/laporan/BapsdSection';
import { SptjSection } from '../../../components/akuntan/laporan/SptjSection';
import { LbbpSection } from '../../../components/akuntan/laporan/LbbpSection';
import { BkkSection } from '../../../components/akuntan/laporan/BkkSection';
import { PdfPreviewModal } from '../../../components/akuntan/laporan/PdfPreviewModal';

export const LaporanPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const allowedKepalaReports = ['LPD2M', 'BKU', 'LRA', 'BAPSD', 'STOCK_BARANG', 'LBBP', 'BKK'];
    const isKepala = user?.role === 'KEPALA_SPPG';

    // Shared period state
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');

    // BAPSD state
    const [bapsdData, setBapsdData] = useState(null);
    const [bapsdLoading, setBapsdLoading] = useState(false);
    const [bapsdPdfLoading, setBapsdPdfLoading] = useState(false);
    const [bapsdNomorDokumen, setBapsdNomorDokumen] = useState('');

    // SPTJ state
    const [sptjData, setSptjData] = useState(null);
    const [sptjLoading, setSptjLoading] = useState(false);
    const [sptjPdfLoading, setSptjPdfLoading] = useState(false);


    // BP subtype state
    const [bpData, setBpData] = useState(null);

    // Loading & PDF state
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfModalTitle, setPdfModalTitle] = useState('Preview PDF Laporan');

    // 1 & 2. BKU & BP data state
    const [reportData, setReportData] = useState([]);

    // 3. Stock Barang specific state
    const [stockTanggal, setStockTanggal] = useState('');
    const [isStockTanggalManual, setIsStockTanggalManual] = useState(false);
    const [stockData, setStockData] = useState([]);

    // 4. Kebutuhan Belanja Bahan specific state
    const [belanjaTanggalMulai, setBelanjaTanggalMulai] = useState('');
    const [belanjaTanggalSelesai, setBelanjaTanggalSelesai] = useState('');
    const [belanjaData, setBelanjaData] = useState(null);

    // 5. Laporan Per Periode specific state
    const [perPeriodeData, setPerPeriodeData] = useState(null);

    // 6. Laporan Per Bulan specific state
    const [perBulanData, setPerBulanData] = useState(null);

    // 7. LR state
    const [lrLoading, setLrLoading] = useState(false);

    // 8. Laporan Harian state
    const [harianTanggal, setHarianTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [harianData, setHarianData] = useState(null);
    const [harianLoading, setHarianLoading] = useState(false);
    const [harianPdfLoading, setHarianPdfLoading] = useState(false);

    // 9. Neraca Saldo specific state
    const [neracaData, setNeracaData] = useState(null);

    // 10. LRA Multi-Periode state
    const [selectedPeriodeIds, setSelectedPeriodeIds] = useState([]);
    const [lraData, setLraData] = useState(null);
    const [lraLoading, setLraLoading] = useState(false);
    const [lraPdfLoading, setLraPdfLoading] = useState(false);
    const [lraExcelLoading, setLraExcelLoading] = useState(false);

    // Excel export loading state
    const [bkuExcelLoading, setBkuExcelLoading] = useState(false);
    const [stockExcelLoading, setStockExcelLoading] = useState(false);

    // 11. LPD2M Multi-Periode state
    const [lpd2mData, setLpd2mData] = useState(null);
    const [lpd2mLoading, setLpd2mLoading] = useState(false);
    const [lpd2mPdfLoading, setLpd2mPdfLoading] = useState(false);
    const [buktiLpd2mList, setBuktiLpd2mList] = useState([]);
    const [buktiLoading, setBuktiLoading] = useState(false);
    const [uploadingBukti, setUploadingBukti] = useState(false);
    const [targetBuktiPeriodeId, setTargetBuktiPeriodeId] = useState('');
    const [namaBuktiInput, setNamaBuktiInput] = useState('');
    const [jenisBuktiInput, setJenisBuktiInput] = useState('BUKTI_TRANSFER');
    const [fileBuktiInput, setFileBuktiInput] = useState(null);

    // 12. BTT state
    const [bttData, setBttData] = useState(null);
    const [bttLoading, setBttLoading] = useState(false);
    const [bttPdfLoading, setBttPdfLoading] = useState(false);
    const [bttKategori, setBttKategori] = useState('operasional');

    // 13. LBBP state
    const [lbbpData, setLbbpData] = useState(null);
    const [lbbpLoading, setLbbpLoading] = useState(false);
    const [lbbpPdfLoading, setLbbpPdfLoading] = useState(false);

    // 14. BKK state
    const [bkkData, setBkkData] = useState(null);
    const [bkkLoading, setBkkLoading] = useState(false);
    const [bkkPdfLoading, setBkkPdfLoading] = useState(false);

    // Map URL path to jenisLaporan
    const getReportFromPath = (path) => {
        if (path.includes('stock-barang')) return 'STOCK_BARANG';
        if (path.includes('kebutuhan-belanja-bahan')) return 'BELANJA_BAHAN';
        if (path.includes('per-periode')) return 'PER_PERIODE';
        if (path.includes('per-bulan')) return 'PER_BULAN';
        if (path.includes('harian')) return 'HARIAN';
        if (path.includes('lra')) return 'LRA';
        if (path.includes('lpd2m')) return 'LPD2M';
        if (path.includes('bapsd')) return 'BAPSD';
        if (path.includes('sptj')) return 'SPTJ';
        if (path.includes('btt')) return 'BTT_OPERASIONAL';
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type');
        if (type === 'lr') return 'LR';
        if (type === 'bp-kas') return 'BP_KAS';
        if (type === 'bp-bahan-baku') return 'BP_BAHAN_BAKU';
        if (type === 'bp-operasional') return 'BP_OPERASIONAL';
        if (type === 'bp-fasilitas') return 'BP_FASILITAS';
        if (type === 'neraca-saldo') return 'NERACA_SALDO';
        if (type === 'btt-operasional') return 'BTT_OPERASIONAL';
        if (type === 'btt-sewa') return 'BTT_SEWA';
        if (type === 'sptj') return 'SPTJ';
        if (type === 'bapsd') return 'BAPSD';
        if (type === 'lbbp') return 'LBBP';
        if (type === 'bkk') return 'BKK';
        // legacy
        if (type === 'bp') return 'BP_KAS';
        return 'BKU';
    };

    const jenisLaporan = getReportFromPath(location.pathname);

    useEffect(() => {
        if (isKepala && !allowedKepalaReports.includes(jenisLaporan)) {
            navigate('/akuntan/laporan', { replace: true });
        }
    }, [isKepala, jenisLaporan, navigate]);

    const handleReportChange = (e) => {
        const val = e.target.value;
        setReportData([]);
        setStockData([]);
        setBelanjaData(null);
        setPerPeriodeData(null);
        setPerBulanData(null);
        setBpData(null);
        setNeracaData(null);
        setLraData(null);
        setLpd2mData(null);
        setBttData(null);
        setBapsdData(null);
        setSptjData(null);
        setLbbpData(null);
        setBkkData(null);
        setSelectedPeriodeIds([]);

        if (val === 'BKU') navigate('/akuntan/laporan');
        else if (val === 'BP_KAS') navigate('/akuntan/laporan?type=bp-kas');
        else if (val === 'BP_BAHAN_BAKU') navigate('/akuntan/laporan?type=bp-bahan-baku');
        else if (val === 'BP_OPERASIONAL') navigate('/akuntan/laporan?type=bp-operasional');
        else if (val === 'BP_FASILITAS') navigate('/akuntan/laporan?type=bp-fasilitas');
        else if (val === 'NERACA_SALDO') navigate('/akuntan/laporan?type=neraca-saldo');
        else if (val === 'STOCK_BARANG') navigate('/akuntan/laporan/stock-barang');
        else if (val === 'BELANJA_BAHAN') navigate('/akuntan/laporan/kebutuhan-belanja-bahan');
        else if (val === 'PER_PERIODE') navigate('/akuntan/laporan/per-periode');
        else if (val === 'PER_BULAN') navigate('/akuntan/laporan/per-bulan');
        else if (val === 'LR') navigate('/akuntan/laporan?type=lr');
        else if (val === 'HARIAN') navigate('/akuntan/laporan/harian');
        else if (val === 'LRA') navigate('/akuntan/laporan/lra');
        else if (val === 'LPD2M') navigate('/akuntan/laporan/lpd2m');
        else if (val === 'BAPSD') navigate('/akuntan/laporan/bapsd');
        else if (val === 'SPTJ') navigate('/akuntan/laporan/sptj');
        else if (val === 'BTT_OPERASIONAL') navigate('/akuntan/laporan?type=btt-operasional');
        else if (val === 'BTT_SEWA') navigate('/akuntan/laporan?type=btt-sewa');
        else if (val === 'LBBP') navigate('/akuntan/laporan?type=lbbp');
        else if (val === 'BKK') navigate('/akuntan/laporan?type=bkk');
    };

    // Fetch periods on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));
    }, []);


    // Load BKU
    const loadBKU = async (pid) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/laporan/bku?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setReportData(resJson.data?.transaksi || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Buku Kas Umum' }));
                toast.error(d.error);
                setReportData([]);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    // Load BP subtype (endpoint = 'kas' | 'bahan-baku' | 'operasional' | 'fasilitas')
    const loadBP = async (pid, endpoint) => {
        if (!pid) return;
        setLoading(true);
        setBpData(null);
        try {
            const r = await request(`/laporan/bp/${endpoint}?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setBpData(resJson);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Buku Pembantu' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    // Load Stock Barang
    const loadStockBarang = async (pid, tgl) => {
        if (!pid || !tgl) return;
        setLoading(true);
        try {
            const r = await request(`/laporan/stock-barang?periodeId=${pid}&tanggal=${tgl}`);
            if (r.ok) {
                const resJson = await r.json();
                setStockData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Stock Barang' }));
                toast.error(d.error);
                setStockData([]);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setStockData([]);
        } finally {
            setLoading(false);
        }
    };

    // Load Kebutuhan Belanja Bahan
    const loadKebutuhanBelanja = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        if (!belanjaTanggalMulai || !belanjaTanggalSelesai) {
            toast.error('Isi tanggal mulai dan tanggal selesai terlebih dahulu');
            return;
        }
        setLoading(true);
        try {
            const r = await request(`/laporan/kebutuhan-belanja-bahan?periodeId=${periodeId}&tanggalMulai=${belanjaTanggalMulai}&tanggalSelesai=${belanjaTanggalSelesai}`);
            if (r.ok) {
                const resJson = await r.json();
                setBelanjaData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Kebutuhan Belanja Bahan' }));
                toast.error(d.error);
                setBelanjaData([]);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setBelanjaData([]);
        } finally {
            setLoading(false);
        }
    };

    // Load Laporan Per Periode
    const loadLaporanPerPeriode = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setLoading(true);
        try {
            const r = await request(`/laporan/per-periode?periodeId=${periodeId}`);
            if (r.ok) {
                const resJson = await r.json();
                setPerPeriodeData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Per Periode' }));
                toast.error(d.error);
                setPerPeriodeData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setPerPeriodeData(null);
        } finally {
            setLoading(false);
        }
    };

    // Load Laporan Per Bulan
    const loadLaporanPerBulan = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setLoading(true);
        try {
            const r = await request(`/laporan/per-bulan?periodeId=${periodeId}`);
            if (r.ok) {
                const resJson = await r.json();
                setPerBulanData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Per Bulan' }));
                toast.error(d.error);
                setPerBulanData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setPerBulanData(null);
        } finally {
            setLoading(false);
        }
    };

    // Load Laporan Harian
    const loadLaporanHarian = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        if (!harianTanggal) { toast.error('Pilih tanggal'); return; }
        setHarianLoading(true);
        try {
            const r = await request(`/laporan/harian?periodeId=${periodeId}&tanggal=${harianTanggal}`);
            if (r.ok) {
                const resJson = await r.json();
                setHarianData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Harian' }));
                toast.error(d.error);
                setHarianData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setHarianData(null);
        } finally {
            setHarianLoading(false);
        }
    };

    // Load LRA Multi-Periode
    const loadLra = async () => {
        if (!selectedPeriodeIds.length) {
            toast.error('Pilih minimal 2 periode untuk LRA komparatif');
            return;
        }
        if (selectedPeriodeIds.length < 2) {
            toast.error('Minimal 2 periode diperlukan untuk laporan komparatif');
            return;
        }
        setLraLoading(true);
        try {
            const r = await request(`/laporan/lra?periodeIds=${selectedPeriodeIds.join(',')}`);
            if (r.ok) {
                const resJson = await r.json();
                setLraData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat LRA' }));
                toast.error(d.error);
                setLraData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setLraData(null);
        } finally {
            setLraLoading(false);
        }
    };

    // Load LPD2M Multi-Periode
    const loadLpd2m = async () => {
        if (!selectedPeriodeIds.length) {
            toast.error('Pilih minimal 1 periode untuk LPD2M');
            return;
        }
        setLpd2mLoading(true);
        try {
            const r = await request(`/laporan/lpd2m?periodeIds=${selectedPeriodeIds.join(',')}`);
            if (r.ok) {
                const resJson = await r.json();
                setLpd2mData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat LPD2M' }));
                toast.error(d.error);
                setLpd2mData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setLpd2mData(null);
        } finally {
            setLpd2mLoading(false);
        }
    };

    // Preview LRA PDF
    const previewLraPdf = async () => {
        if (selectedPeriodeIds.length < 2) {
            toast.error('Pilih minimal 2 periode untuk LRA komparatif');
            return;
        }
        setLraPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — Laporan Realisasi Anggaran (LRA)');
            const r = await request(`/laporan/lra/pdf?periodeIds=${selectedPeriodeIds.join(',')}`);
            if (!r.ok) {
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF LRA' }));
                toast.error(errData.error || 'Gagal membuat PDF LRA');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setLraPdfLoading(false);
        }
    };

    // ── Excel Export Handlers ───────────────────────────────────────────────

    /** BKU → Excel */
    const exportBkuExcel = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        setBkuExcelLoading(true);
        try {
            const r = await request(`/laporan/bku/export-excel?periodeId=${periodeId}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat Excel BKU' }));
                toast.error(d.error || 'Gagal membuat Excel BKU');
                return;
            }
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BKU-${periodeId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat export Excel');
        } finally {
            setBkuExcelLoading(false);
        }
    };

    /** LRA → Excel */
    const exportLraExcel = async () => {
        if (selectedPeriodeIds.length < 2) {
            toast.error('Pilih minimal 2 periode untuk LRA komparatif');
            return;
        }
        setLraExcelLoading(true);
        try {
            const r = await request(`/laporan/lra/export-excel?periodeIds=${selectedPeriodeIds.join(',')}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat Excel LRA' }));
                toast.error(d.error || 'Gagal membuat Excel LRA');
                return;
            }
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'LRA-SAP-BGN.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat export Excel');
        } finally {
            setLraExcelLoading(false);
        }
    };

    /** Stock Barang → Excel */
    const exportStockExcel = async () => {
        if (!periodeId || !stockTanggal) { toast.error('Pilih periode dan tanggal'); return; }
        setStockExcelLoading(true);
        try {
            const r = await request(`/laporan/stock-barang/export-excel?periodeId=${periodeId}&tanggal=${stockTanggal}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat Excel Stock Barang' }));
                toast.error(d.error || 'Gagal membuat Excel Stock Barang');
                return;
            }
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Stock-Barang-${stockTanggal}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat export Excel');
        } finally {
            setStockExcelLoading(false);
        }
    };

    // Bukti LPD2M handlers
    const loadBuktiLpd2m = async (pIds) => {
        const idsToFetch = Array.isArray(pIds) ? pIds : [pIds].filter(Boolean);
        if (!idsToFetch.length) {
            setBuktiLpd2mList([]);
            return;
        }
        setBuktiLoading(true);
        try {
            const results = await Promise.all(
                idsToFetch.map(id => request(`/laporan/lpd2m/bukti?periodeId=${id}`).then(res => res.ok ? res.json() : { data: [] }))
            );
            const allBukti = results.flatMap(r => r.data || []);
            setBuktiLpd2mList(allBukti);
        } catch (err) {
            console.error('Gagal load bukti LPD2M:', err);
            setBuktiLpd2mList([]);
        } finally {
            setBuktiLoading(false);
        }
    };

    const handleUploadBukti = async (e) => {
        e.preventDefault();
        const pid = targetBuktiPeriodeId || selectedPeriodeIds[0] || periodeId;
        if (!pid) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        if (!namaBuktiInput.trim()) {
            toast.error('Nama bukti wajib diisi');
            return;
        }
        if (!fileBuktiInput) {
            toast.error('Pilih file bukti yang akan diupload');
            return;
        }

        const formData = new FormData();
        formData.append('periodeId', pid);
        formData.append('namaBukti', namaBuktiInput.trim());
        formData.append('jenis', jenisBuktiInput);
        formData.append('file', fileBuktiInput);

        setUploadingBukti(true);
        try {
            const res = await request('/laporan/lpd2m/bukti', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Bukti LPD2M berhasil diupload');
                setNamaBuktiInput('');
                setFileBuktiInput(null);
                const fileEl = document.getElementById('input-file-bukti-lpd2m');
                if (fileEl) fileEl.value = '';
                const ids = selectedPeriodeIds.length ? selectedPeriodeIds : (periodeId ? [periodeId] : []);
                loadBuktiLpd2m(ids);
            } else {
                toast.error(data.error || 'Gagal mengupload bukti');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat upload bukti');
        } finally {
            setUploadingBukti(false);
        }
    };

    const handleDeleteBukti = async (id) => {
        if (!window.confirm('Hapus bukti LPD2M ini?')) return;
        try {
            const res = await request(`/laporan/lpd2m/bukti/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Bukti LPD2M berhasil dihapus');
                const ids = selectedPeriodeIds.length ? selectedPeriodeIds : (periodeId ? [periodeId] : []);
                loadBuktiLpd2m(ids);
            } else {
                toast.error(data.error || 'Gagal menghapus bukti');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat menghapus bukti');
        }
    };

    // Preview LPD2M PDF
    const previewLpd2mPdf = async () => {
        if (!selectedPeriodeIds.length) {
            toast.error('Pilih minimal 1 periode untuk LPD2M');
            return;
        }
        setLpd2mPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — Laporan Perkembangan Dana Dua Mingguan (LPD2M)');
            const r = await request(`/laporan/lpd2m/pdf?periodeIds=${selectedPeriodeIds.join(',')}`);
            if (!r.ok) {
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF LPD2M' }));
                toast.error(errData.error || 'Gagal membuat PDF LPD2M');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
            setIsPdfModalOpen(true);
            loadBuktiLpd2m(selectedPeriodeIds);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setLpd2mPdfLoading(false);
        }
    };

    // Load BTT
    const loadBttData = async () => {
        if (!periodeId) { toast.error('Pilih periode'); return; }
        setBttLoading(true);
        try {
            const r = await request(`/laporan/btt?periodeId=${periodeId}&kategori=${bttKategori}`);
            if (r.ok) {
                const d = await r.json();
                setBttData(d.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat BTT' }));
                toast.error(d.error);
                setBttData(null);
            }
        } catch (err) {
            toast.error(err.message);
            setBttData(null);
        } finally {
            setBttLoading(false);
        }
    };

    // Preview BTT PDF
    const previewBttPdf = async () => {
        if (!periodeId) { toast.error('Pilih periode'); return; }
        setBttPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — Bukti Tanda Terima');
            const r = await request(`/laporan/btt/pdf?periodeId=${periodeId}&kategori=${bttKategori}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal' }));
                toast.error(d.error);
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            setPdfUrl(URL.createObjectURL(blob));
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBttPdfLoading(false);
        }
    };

    // Preview Stock Barang PDF
    const previewStockBarangPdf = async () => {
        if (!periodeId || !stockTanggal) { toast.error('Pilih periode dan tanggal'); return; }
        setPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — Stock Barang');
            const r = await request(`/laporan/stock-barang/pdf?periodeId=${periodeId}&tanggal=${stockTanggal}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal' }));
                toast.error(d.error);
                return;
            }
            setPdfUrl(URL.createObjectURL(new Blob([await r.blob()], { type: 'application/pdf' })));
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setPdfLoading(false);
        }
    };

    // Preview Kebutuhan Belanja PDF
    const previewBelanjaPdf = async () => {
        if (!periodeId || !belanjaTanggalMulai || !belanjaTanggalSelesai) { toast.error('Lengkapi filter'); return; }
        setPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — Kebutuhan Belanja Bahan');
            const r = await request(`/laporan/kebutuhan-belanja/pdf?periodeId=${periodeId}&tanggalMulai=${belanjaTanggalMulai}&tanggalSelesai=${belanjaTanggalSelesai}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal' }));
                toast.error(d.error);
                return;
            }
            setPdfUrl(URL.createObjectURL(new Blob([await r.blob()], { type: 'application/pdf' })));
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setPdfLoading(false);
        }
    };

    // Preview Laporan Per Periode PDF
    const previewPerPeriodePdf = async () => {
        if (!periodeId) { toast.error('Pilih periode'); return; }
        setPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — Laporan Per Periode');
            const r = await request(`/laporan/per-periode/pdf?periodeId=${periodeId}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal' }));
                toast.error(d.error);
                return;
            }
            setPdfUrl(URL.createObjectURL(new Blob([await r.blob()], { type: 'application/pdf' })));
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setPdfLoading(false);
        }
    };

    // Preview Laporan Per Bulan PDF
    const previewPerBulanPdf = async () => {
        if (!periodeId) { toast.error('Pilih periode'); return; }
        setPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — Laporan Per Bulan');
            const r = await request(`/laporan/per-bulan/pdf?periodeId=${periodeId}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal' }));
                toast.error(d.error);
                return;
            }
            setPdfUrl(URL.createObjectURL(new Blob([await r.blob()], { type: 'application/pdf' })));
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setPdfLoading(false);
        }
    };

    // Preview BKU sebagai PDF (inline di modal)
    const previewBkuPdf = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF Laporan (BKU)');
            const r = await request(`/laporan/bku/pdf?periodeId=${periodeId}`);
            if (!r.ok) {
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF BKU' }));
                toast.error(errData.error || 'Gagal membuat PDF BKU');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setPdfLoading(false);
        }
    };

    // Preview Neraca Saldo PDF
    const previewNeracaSaldoPdf = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — Neraca Saldo');
            const r = await request(`/laporan/neraca-saldo/pdf?periodeId=${periodeId}`);
            if (!r.ok) {
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF Neraca Saldo' }));
                toast.error(errData.error || 'Gagal membuat PDF Neraca Saldo');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setPdfLoading(false);
        }
    };

    // Preview Catatan sebagai PDF (inline di modal)
    const previewCatatanPdf = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF Catatan Pengeluaran Bulanan');
            const r = await request(`/laporan/catatan/pdf?periodeId=${periodeId}`);
            if (!r.ok) {
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF Catatan' }));
                toast.error(errData.error || 'Gagal membuat PDF Catatan');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setPdfLoading(false);
        }
    };

    // Preview LR sebagai PDF
    const previewLrPdf = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setLrLoading(true);
        try {
            setPdfModalTitle('Preview PDF — LR (Laporan Resume Penerimaan-Pengeluaran)');
            const r = await request(`/laporan/lpa/pdf?periodeId=${periodeId}&isLr=true`);
            if (!r.ok) {
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF LR' }));
                toast.error(errData.error || 'Gagal membuat PDF LR');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setLrLoading(false);
        }
    };

    // Preview Laporan Harian sebagai PDF
    const previewHarianPdf = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        if (!harianTanggal) { toast.error('Pilih tanggal'); return; }
        setHarianPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — Laporan Harian');
            const r = await request(`/laporan/harian/pdf?periodeId=${periodeId}&tanggal=${harianTanggal}`);
            if (!r.ok) {
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF Laporan Harian' }));
                toast.error(errData.error || 'Gagal membuat PDF Laporan Harian');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setHarianPdfLoading(false);
        }
    };

    // Preview BP PDF — endpoint ditentukan dari jenisLaporan saat ini
    const BP_ENDPOINT_MAP = {
        BP_KAS: 'kas',
        BP_BAHAN_BAKU: 'bahan-baku',
        BP_OPERASIONAL: 'operasional',
        BP_FASILITAS: 'fasilitas',
    };
    const previewBpPdf = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        const endpoint = BP_ENDPOINT_MAP[jenisLaporan];
        if (!endpoint) return;
        setPdfLoading(true);
        try {
            setPdfModalTitle(`Preview PDF Buku Pembantu ${bpData?.jenisPembantu || ''}`);
            const r = await request(`/laporan/bp/${endpoint}/pdf?periodeId=${periodeId}`);
            if (!r.ok) {
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF BP' }));
                toast.error(errData.error || 'Gagal membuat PDF BP');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setPdfLoading(false);
        }
    };

    // Helper untuk period change bound auto-fill (Kebutuhan Belanja)
    const handlePeriodChangeForBelanja = (pid) => {
        setPeriodeId(pid);
        const p = periods.find(item => item.id === pid);
        if (p) {
            setBelanjaTanggalMulai(p.tanggalMulai);
            setBelanjaTanggalSelesai(p.tanggalSelesai);
        }
    };

    // Helper untuk konversi format Bulan ke Bahasa Indonesia (misal: "2026-01" -> "Januari 2026")
    const formatIndoMonth = (year, month) => {
        const namaBulan = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        if (month >= 1 && month <= 12) {
            return `${namaBulan[month - 1]} ${year}`;
        }
        return `${year}-${String(month).padStart(2, '0')}`;
    };

    // Auto-fetch effects depending on type and filters
    useEffect(() => {
        if (jenisLaporan === 'BKU' && periodeId) {
            loadBKU(periodeId);
        }
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (jenisLaporan === 'BP_KAS' && periodeId) loadBP(periodeId, 'kas');
        else if (jenisLaporan === 'BP_BAHAN_BAKU' && periodeId) loadBP(periodeId, 'bahan-baku');
        else if (jenisLaporan === 'BP_OPERASIONAL' && periodeId) loadBP(periodeId, 'operasional');
        else if (jenisLaporan === 'BP_FASILITAS' && periodeId) loadBP(periodeId, 'fasilitas');
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (periodeId && periods.length && !isStockTanggalManual) {
            const activePeriod = periods.find(p => String(p.id) === String(periodeId));
            if (activePeriod && activePeriod.tanggalSelesai) {
                setStockTanggal(activePeriod.tanggalSelesai.slice(0, 10));
            }
        }
    }, [periodeId, periods, isStockTanggalManual]);

    useEffect(() => {
        if (jenisLaporan === 'STOCK_BARANG' && periodeId && stockTanggal) {
            loadStockBarang(periodeId, stockTanggal);
        }
    }, [jenisLaporan, periodeId, stockTanggal]);

    useEffect(() => {
        if (jenisLaporan === 'PER_PERIODE' && periodeId) {
            loadLaporanPerPeriode();
        }
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (jenisLaporan === 'PER_BULAN' && periodeId) {
            loadLaporanPerBulan();
        }
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (jenisLaporan === 'HARIAN' && periodeId && harianTanggal) {
            loadLaporanHarian();
        }
    }, [jenisLaporan, periodeId, harianTanggal]);

    useEffect(() => {
        if (jenisLaporan === 'BTT_OPERASIONAL' || jenisLaporan === 'BTT_SEWA') {
            setBttKategori(jenisLaporan === 'BTT_SEWA' ? 'sewa' : 'operasional');
            loadBttData();
        }
    }, [jenisLaporan, periodeId]);

    // Load BAPSD
    const loadBapsd = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        setBapsdLoading(true);
        try {
            const nom = bapsdNomorDokumen.trim() || '001/BAPSD/' + new Date().getFullYear();
            const r = await request(`/laporan/bapsd?periodeId=${periodeId}&nomorDokumen=${encodeURIComponent(nom)}`);
            if (r.ok) {
                const resJson = await r.json();
                setBapsdData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat BAPSD' }));
                toast.error(d.error);
                setBapsdData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setBapsdData(null);
        } finally {
            setBapsdLoading(false);
        }
    };

    // Preview BAPSD PDF
    const previewBapsdPdf = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        setBapsdPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — BAPSD');
            const nom = bapsdNomorDokumen.trim() || '001/BAPSD/' + new Date().getFullYear();
            const r = await request(`/laporan/bapsd/pdf?periodeId=${periodeId}&nomorDokumen=${encodeURIComponent(nom)}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat PDF BAPSD' }));
                toast.error(d.error);
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            setPdfUrl(URL.createObjectURL(blob));
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan');
        } finally {
            setBapsdPdfLoading(false);
        }
    };

    // Load SPTJ
    const loadSptj = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        setSptjLoading(true);
        try {
            const r = await request(`/laporan/sptj?periodeId=${periodeId}`);
            if (r.ok) {
                const resJson = await r.json();
                setSptjData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat SPTJ' }));
                toast.error(d.error);
                setSptjData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setSptjData(null);
        } finally {
            setSptjLoading(false);
        }
    };

    // Preview SPTJ PDF
    const previewSptjPdf = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        setSptjPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — SPTJ');
            const r = await request(`/laporan/sptj/pdf?periodeId=${periodeId}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat PDF SPTJ' }));
                toast.error(d.error);
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            setPdfUrl(URL.createObjectURL(blob));
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan');
        } finally {
            setSptjPdfLoading(false);
        }
    };

    // Load LBBP
    const loadLbbp = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        setLbbpLoading(true);
        try {
            const r = await request(`/laporan/lbbp?periodeId=${periodeId}`);
            if (r.ok) {
                const resJson = await r.json();
                setLbbpData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat LBBP' }));
                toast.error(d.error);
                setLbbpData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setLbbpData(null);
        } finally {
            setLbbpLoading(false);
        }
    };

    // Preview LBBP PDF
    const previewLbbpPdf = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        setLbbpPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — LBBP (Buku Belanja Bahan Pokok)');
            const r = await request(`/laporan/lbbp/pdf?periodeId=${periodeId}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat PDF LBBP' }));
                toast.error(d.error);
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            setPdfUrl(URL.createObjectURL(blob));
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setLbbpPdfLoading(false);
        }
    };

    useEffect(() => {
        if (jenisLaporan === 'BAPSD' && periodeId) {
            loadBapsd();
        }
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (jenisLaporan === 'SPTJ' && periodeId) {
            loadSptj();
        }
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (jenisLaporan === 'NERACA_SALDO' && periodeId) {
            setLoading(true);
            setNeracaData(null);
            request(`/laporan/neraca-saldo?periodeId=${periodeId}`)
                .then(r => r.json())
                .then(d => { if (d.success) setNeracaData(d.data); else toast.error(d.error || 'Gagal memuat Neraca Saldo'); })
                .catch(() => toast.error('Terjadi kesalahan koneksi'))
                .finally(() => setLoading(false));
        }
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (jenisLaporan === 'LBBP' && periodeId) {
            loadLbbp();
        }
    }, [jenisLaporan, periodeId]);

    // Load BKK
    const loadBkk = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        setBkkLoading(true);
        try {
            const r = await request(`/laporan/bkk?periodeId=${periodeId}`);
            if (r.ok) {
                const resJson = await r.json();
                setBkkData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat BKK' }));
                toast.error(d.error);
                setBkkData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setBkkData(null);
        } finally {
            setBkkLoading(false);
        }
    };

    // Preview BKK PDF
    const previewBkkPdf = async () => {
        if (!periodeId) { toast.error('Pilih periode terlebih dahulu'); return; }
        setBkkPdfLoading(true);
        try {
            setPdfModalTitle('Preview PDF — BKK (Buku Kas Kecil)');
            const r = await request(`/laporan/bkk/pdf?periodeId=${periodeId}`);
            if (!r.ok) {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat PDF BKK' }));
                toast.error(d.error);
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            setPdfUrl(URL.createObjectURL(blob));
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setBkkPdfLoading(false);
        }
    };

    useEffect(() => {
        if (jenisLaporan === 'BKK' && periodeId) {
            loadBkk();
        }
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (jenisLaporan === 'LPD2M') {
            const ids = selectedPeriodeIds.length ? selectedPeriodeIds : (periodeId ? [periodeId] : []);
            if (ids.length) {
                if (!targetBuktiPeriodeId || !ids.includes(targetBuktiPeriodeId)) {
                    setTargetBuktiPeriodeId(ids[0]);
                }
                loadBuktiLpd2m(ids);
            } else {
                setBuktiLpd2mList([]);
            }
        }
    }, [jenisLaporan, selectedPeriodeIds, periodeId]);

    useEffect(() => {
        if (periodeId && periods.length) {
            const p = periods.find(item => item.id === periodeId);
            if (p) {
                setBelanjaTanggalMulai(p.tanggalMulai);
                setBelanjaTanggalSelesai(p.tanggalSelesai);
            }
        }
    }, [periodeId, periods]);

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Laporan Keuangan &amp; Operasional</h2>

            {/* Filter Section */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                alignItems: 'flex-end'
            }}>
                <ReportFilterBar
                    periods={periods}
                    periodeId={periodeId}
                    setPeriodeId={setPeriodeId}
                    selectedPeriodeIds={selectedPeriodeIds}
                    setSelectedPeriodeIds={setSelectedPeriodeIds}
                    jenisLaporan={jenisLaporan}
                    handleReportChange={handleReportChange}
                    isKepala={isKepala}
                    stockTanggal={stockTanggal}
                    setStockTanggal={setStockTanggal}
                    setIsStockTanggalManual={setIsStockTanggalManual}
                    belanjaTanggalMulai={belanjaTanggalMulai}
                    setBelanjaTanggalMulai={setBelanjaTanggalMulai}
                    belanjaTanggalSelesai={belanjaTanggalSelesai}
                    setBelanjaTanggalSelesai={setBelanjaTanggalSelesai}
                    handlePeriodChangeForBelanja={handlePeriodChangeForBelanja}
                    harianTanggal={harianTanggal}
                    setHarianTanggal={setHarianTanggal}
                    bapsdNomorDokumen={bapsdNomorDokumen}
                    setBapsdNomorDokumen={setBapsdNomorDokumen}
                />

                <ReportActionButtons
                    handleReportChange={handleReportChange}
                    jenisLaporan={jenisLaporan}
                    loadLra={loadLra}
                    lraLoading={lraLoading}
                    previewLraPdf={previewLraPdf}
                    lraPdfLoading={lraPdfLoading}
                    exportLraExcel={exportLraExcel}
                    lraExcelLoading={lraExcelLoading}
                    loadLpd2m={loadLpd2m}
                    lpd2mLoading={lpd2mLoading}
                    previewLpd2mPdf={previewLpd2mPdf}
                    lpd2mPdfLoading={lpd2mPdfLoading}
                    previewBkuPdf={previewBkuPdf}
                    previewCatatanPdf={previewCatatanPdf}
                    pdfLoading={pdfLoading}
                    exportBkuExcel={exportBkuExcel}
                    bkuExcelLoading={bkuExcelLoading}
                    previewBpPdf={previewBpPdf}
                    bpData={bpData}
                    loadStockBarang={loadStockBarang}
                    stockTanggal={stockTanggal}
                    previewStockBarangPdf={previewStockBarangPdf}
                    exportStockExcel={exportStockExcel}
                    stockExcelLoading={stockExcelLoading}
                    loadKebutuhanBelanja={loadKebutuhanBelanja}
                    previewBelanjaPdf={previewBelanjaPdf}
                    loadLaporanPerPeriode={loadLaporanPerPeriode}
                    perPeriodeData={perPeriodeData}
                    previewPerPeriodePdf={previewPerPeriodePdf}
                    loadLaporanPerBulan={loadLaporanPerBulan}
                    perBulanData={perBulanData}
                    previewPerBulanPdf={previewPerBulanPdf}
                    loadBttData={loadBttData}
                    bttLoading={bttLoading}
                    previewBttPdf={previewBttPdf}
                    bttPdfLoading={bttPdfLoading}
                    bttData={bttData}
                    previewLrPdf={previewLrPdf}
                    lrLoading={lrLoading}
                    loadLaporanHarian={loadLaporanHarian}
                    harianLoading={harianLoading}
                    previewHarianPdf={previewHarianPdf}
                    harianPdfLoading={harianPdfLoading}
                    harianData={harianData}
                    loadBapsd={loadBapsd}
                    bapsdLoading={bapsdLoading}
                    previewBapsdPdf={previewBapsdPdf}
                    bapsdPdfLoading={bapsdPdfLoading}
                    bapsdNomorDokumen={bapsdNomorDokumen}
                    setBapsdNomorDokumen={setBapsdNomorDokumen}
                    loadSptj={loadSptj}
                    sptjLoading={sptjLoading}
                    previewSptjPdf={previewSptjPdf}
                    sptjPdfLoading={sptjPdfLoading}
                    loadLbbp={loadLbbp}
                    lbbpLoading={lbbpLoading}
                    previewLbbpPdf={previewLbbpPdf}
                    lbbpPdfLoading={lbbpPdfLoading}
                    loadBkk={loadBkk}
                    bkkLoading={bkkLoading}
                    previewBkkPdf={previewBkkPdf}
                    bkkPdfLoading={bkkPdfLoading}
                    selectedPeriodeIds={selectedPeriodeIds}
                    periodeId={periodeId}
                />
            </div>

            {/* Loading Skeleton */}
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}

            {/* Render 1. BKU Table */}
            {!loading && jenisLaporan === 'BKU' && (
                <BkuTable reportData={reportData} />
            )}

            {/* Render 2. Buku Pembantu (4 subtypes) */}
            {!loading && (jenisLaporan === 'BP_KAS' || jenisLaporan === 'BP_BAHAN_BAKU' || jenisLaporan === 'BP_OPERASIONAL' || jenisLaporan === 'BP_FASILITAS') && (
                <BpTable bpData={bpData} jenisLaporan={jenisLaporan} />
            )}

            {/* Render Neraca Saldo */}
            {!loading && jenisLaporan === 'NERACA_SALDO' && (
                <NeracaSaldoTable neracaData={neracaData} previewNeracaSaldoPdf={previewNeracaSaldoPdf} pdfLoading={pdfLoading} />
            )}

            {/* Render 3. Stock Barang Table */}
            {!loading && jenisLaporan === 'STOCK_BARANG' && (
                <StockBarangTable stockData={stockData} />
            )}

            {/* Render 4. Kebutuhan Belanja Bahan Table */}
            {!loading && jenisLaporan === 'BELANJA_BAHAN' && (
                <KebutuhanBelanjaTable belanjaData={belanjaData} />
            )}

            {/* Render 5. Laporan Per Periode Table */}
            {!loading && jenisLaporan === 'PER_PERIODE' && (
                <PerPeriodeTable perPeriodeData={perPeriodeData} />
            )}

            {/* Render 6. Laporan Per Bulan Table */}
            {!loading && jenisLaporan === 'PER_BULAN' && (
                <PerBulanTable perBulanData={perBulanData} formatIndoMonth={formatIndoMonth} />
            )}

            {/* Render 7. Laporan Harian */}
            {!harianLoading && jenisLaporan === 'HARIAN' && (
                <LaporanHarianSection harianData={harianData} />
            )}

            {!loading && jenisLaporan === 'LR' && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Pilih periode dan klik &quot;Preview PDF LR&quot; untuk menampilkan laporan.
                </p>
            )}

            {/* Render 10. LRA Multi-Periode */}
            {!lraLoading && jenisLaporan === 'LRA' && (
                <LraTable lraData={lraData} />
            )}

            {/* Render 11. LPD2M Multi-Periode */}
            {jenisLaporan === 'LPD2M' && (
                <Lpd2mBuktiSection
                    selectedPeriodeIds={selectedPeriodeIds}
                    periods={periods}
                    targetBuktiPeriodeId={targetBuktiPeriodeId}
                    setTargetBuktiPeriodeId={setTargetBuktiPeriodeId}
                    namaBuktiInput={namaBuktiInput}
                    setNamaBuktiInput={setNamaBuktiInput}
                    jenisBuktiInput={jenisBuktiInput}
                    setJenisBuktiInput={setJenisBuktiInput}
                    setFileBuktiInput={setFileBuktiInput}
                    uploadingBukti={uploadingBukti}
                    buktiLpd2mList={buktiLpd2mList}
                    buktiLoading={buktiLoading}
                    handleUploadBukti={handleUploadBukti}
                    handleDeleteBukti={handleDeleteBukti}
                />
            )}

            {!lpd2mLoading && jenisLaporan === 'LPD2M' && (
                <Lpd2mTable lpd2mData={lpd2mData} />
            )}

            {/* Render 12. BTT */}
            {!bttLoading && (jenisLaporan === 'BTT_OPERASIONAL' || jenisLaporan === 'BTT_SEWA') && (
                <BttSection bttData={bttData} />
            )}

            {/* Render BAPSD */}
            {!loading && jenisLaporan === 'BAPSD' && (
                <BapsdSection bapsdData={bapsdData} />
            )}

            {/* Render SPTJ */}
            {!loading && jenisLaporan === 'SPTJ' && (
                <SptjSection sptjData={sptjData} />
            )}

            {/* Render LBBP */}
            {!loading && jenisLaporan === 'LBBP' && (
                lbbpData ? (
                    <LbbpSection lbbpData={lbbpData} />
                ) : (
                    lbbpLoading ? null : (
                        <LbbpSection lbbpData={lbbpData} />
                    )
                )
            )}

            {/* Render BKK */}
            {!loading && jenisLaporan === 'BKK' && (
                bkkData ? (
                    <BkkSection bkkData={bkkData} />
                ) : (
                    bkkLoading ? null : (
                        <BkkSection bkkData={bkkData} />
                    )
                )
            )}

            {/* PDF Preview Modal */}
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
