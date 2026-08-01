import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { Table } from '../../../components/Table';
import { Skeleton } from '../../../components/Skeleton';
import { DatePicker } from '../../../components/DatePicker';

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
                {/* Pilihan Jenis Laporan */}
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Jenis Laporan
                    </label>
                    <select
                        value={jenisLaporan}
                        onChange={handleReportChange}
                        className="form-field"
                    >
                        {isKepala ? (
                            <>
                                <option value="LPD2M">LPD2M (Laporan Perkembangan Dana 2 Mingguan)</option>
                                <option value="BKU">Buku Kas Umum (BKU)</option>
                                <option value="LRA">LRA (Laporan Realisasi Anggaran)</option>
                                <option value="BAPSD">BAPSD (Berita Acara Pengalihan Sisa Dana)</option>
                                <option value="STOCK_BARANG">Stock Barang (Persediaan)</option>
                                <option value="LBBP">LBBP (Buku Belanja Bahan Pokok)</option>
                                <option value="BKK">BKK (Buku Kas Kecil)</option>
                            </>
                        ) : (
                            <>
                                <option value="BKU">Buku Kas Umum (BKU)</option>
                                <option value="BP_KAS">BP - Kas</option>
                                <option value="BP_BAHAN_BAKU">BP - Bahan Baku</option>
                                <option value="BP_OPERASIONAL">BP - Operasional</option>
                                <option value="BP_FASILITAS">BP - Insentif Fasilitas</option>
                                <option value="NERACA_SALDO">Neraca Saldo</option>
                                <option value="STOCK_BARANG">Stock Barang (Persediaan)</option>
                                <option value="BELANJA_BAHAN">Kebutuhan Belanja Bahan</option>
                                <option value="PER_PERIODE">Laporan Per Periode (Pagu vs Realisasi)</option>
                                <option value="PER_BULAN">Laporan Kas Bulanan</option>
                                <option value="LR">LR (Laporan Resume Penerimaan-Pengeluaran)</option>
                                <option value="HARIAN">Laporan Harian</option>
                                <option value="LRA">LRA (Laporan Realisasi Anggaran)</option>
                                <option value="LPD2M">LPD2M (Laporan Perkembangan Dana 2 Mingguan)</option>
                                <option value="BTT_OPERASIONAL">BTT - Operasional</option>
                                <option value="BTT_SEWA">BTT - Sewa</option>
                                <option value="SPTJ">SPTJ (Surat Pernyataan Tanggung Jawab)</option>
                                <option value="BAPSD">BAPSD (Berita Acara Pengalihan Sisa Dana)</option>
                                <option value="LBBP">LBBP (Buku Belanja Bahan Pokok)</option>
                                <option value="BKK">BKK (Buku Kas Kecil)</option>
                            </>
                        )}
                    </select>
                </div>

                {/* Pilihan Periode */}
                {jenisLaporan === 'LRA' || jenisLaporan === 'LPD2M' ? (
                    <div style={{ flex: '1 1 300px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Pilih Periode (Multi-Select)
                        </label>
                        <div style={{
                            maxHeight: '120px',
                            overflowY: 'auto',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg)'
                        }}>
                            {periods.map(p => {
                                const isChecked = selectedPeriodeIds.includes(p.id);
                                return (
                                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setSelectedPeriodeIds([...selectedPeriodeIds, p.id]);
                                                } else {
                                                    setSelectedPeriodeIds(selectedPeriodeIds.filter(id => id !== p.id));
                                                }
                                            }}
                                        />
                                        {p.tanggalMulai} - {p.tanggalSelesai} ({p.status})
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Periode
                        </label>
                        <select
                            value={periodeId}
                            onChange={e => {
                                const selectedId = e.target.value;
                                setIsStockTanggalManual(false);
                                if (jenisLaporan === 'BELANJA_BAHAN') {
                                    handlePeriodChangeForBelanja(selectedId);
                                } else {
                                    setPeriodeId(selectedId);
                                }
                            }}
                            className="form-field"
                        >
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.tanggalMulai} - {p.tanggalSelesai}
                                </option>
                            ))}
                        </select>
                    </div>
                )}


                {jenisLaporan === 'STOCK_BARANG' && (
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Tanggal Cutoff Stock (Default: Tanggal Akhir Periode)
                        </label>
                        <DatePicker
                            value={stockTanggal}
                            onChange={(val) => {
                                setStockTanggal(val);
                                setIsStockTanggalManual(true);
                            }}
                            required
                        />
                    </div>
                )}

                {/* Belanja Bahan-specific Date Pickers */}
                {jenisLaporan === 'BELANJA_BAHAN' && (
                    <>
                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Tanggal Mulai
                            </label>
                            <DatePicker
                                value={belanjaTanggalMulai}
                                onChange={setBelanjaTanggalMulai}
                                defaultFocusMonth={belanjaTanggalMulai}
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Tanggal Selesai
                            </label>
                            <DatePicker
                                value={belanjaTanggalSelesai}
                                onChange={setBelanjaTanggalSelesai}
                                defaultFocusMonth={belanjaTanggalSelesai}
                                required
                            />
                        </div>
                    </>
                )}

                {/* Laporan Harian-specific Date Picker */}
                {jenisLaporan === 'HARIAN' && (
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Tanggal
                        </label>
                        <DatePicker
                            value={harianTanggal}
                            onChange={setHarianTanggal}
                            required
                        />
                    </div>
                )}

                {/* Buttons depending on report type */}
                <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px' }}>
                    {jenisLaporan === 'LRA' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLra}
                                disabled={lraLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: lraLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: lraLoading ? 0.65 : 1
                                }}
                            >
                                {lraLoading ? 'Memuat…' : 'Tampilkan LRA'}
                            </button>
                            <button
                                type="button"
                                onClick={previewLraPdf}
                                disabled={lraPdfLoading || selectedPeriodeIds.length < 2}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (lraPdfLoading || selectedPeriodeIds.length < 2) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (lraPdfLoading || selectedPeriodeIds.length < 2) ? 0.65 : 1
                                }}
                            >
                                {lraPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF LRA'}
                            </button>
                            <button
                                type="button"
                                onClick={exportLraExcel}
                                disabled={lraExcelLoading || selectedPeriodeIds.length < 2}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#217346',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (lraExcelLoading || selectedPeriodeIds.length < 2) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (lraExcelLoading || selectedPeriodeIds.length < 2) ? 0.65 : 1
                                }}
                            >
                                {lraExcelLoading ? 'Mengekspor…' : '📊 Export Excel LRA'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'LPD2M' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLpd2m}
                                disabled={lpd2mLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: lpd2mLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: lpd2mLoading ? 0.65 : 1
                                }}
                            >
                                {lpd2mLoading ? 'Memuat…' : 'Tampilkan LPD2M'}
                            </button>
                            <button
                                type="button"
                                onClick={previewLpd2mPdf}
                                disabled={lpd2mPdfLoading || !selectedPeriodeIds.length}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (lpd2mPdfLoading || !selectedPeriodeIds.length) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (lpd2mPdfLoading || !selectedPeriodeIds.length) ? 0.65 : 1
                                }}
                            >
                                {lpd2mPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF LPD2M'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'BKU' && (
                        <>
                            <button
                                type="button"
                                onClick={previewBkuPdf}
                                disabled={pdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: pdfLoading ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF…' : '📄 Preview PDF'}
                            </button>
                            <button
                                type="button"
                                onClick={previewCatatanPdf}
                                disabled={pdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: pdfLoading ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF…' : '📄 Preview Catatan Pengeluaran'}
                            </button>
                            <button
                                type="button"
                                onClick={exportBkuExcel}
                                disabled={bkuExcelLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#217346',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bkuExcelLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bkuExcelLoading ? 0.65 : 1
                                }}
                            >
                                {bkuExcelLoading ? 'Mengekspor…' : '📊 Export Excel BKU'}
                            </button>
                        </>
                    )}
                    {(jenisLaporan === 'BP_KAS' || jenisLaporan === 'BP_BAHAN_BAKU' || jenisLaporan === 'BP_OPERASIONAL' || jenisLaporan === 'BP_FASILITAS') && (
                        <button
                            type="button"
                            onClick={previewBpPdf}
                            disabled={pdfLoading || !bpData}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: (pdfLoading || !bpData) ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                opacity: (pdfLoading || !bpData) ? 0.65 : 1
                            }}
                        >
                            {pdfLoading ? 'Membuat PDF…' : '📄 Preview PDF BP'}
                        </button>
                    )}
                    {jenisLaporan === 'STOCK_BARANG' && (
                        <>
                            <button
                                type="button"
                                onClick={() => loadStockBarang(periodeId, stockTanggal)}
                                className="btn-secondary"
                                style={{
                                    padding: '10px 20px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Refresh
                            </button>
                            <button
                                type="button"
                                onClick={previewStockBarangPdf}
                                disabled={pdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: pdfLoading ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF...' : '\uD83D\uDCC4 Preview PDF Stock Barang'}
                            </button>
                            <button
                                type="button"
                                onClick={exportStockExcel}
                                disabled={stockExcelLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#217346',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: stockExcelLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: stockExcelLoading ? 0.65 : 1
                                }}
                            >
                                {stockExcelLoading ? 'Mengekspor…' : '📊 Export Excel Stock'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'BELANJA_BAHAN' && (
                        <>
                            <button
                                type="button"
                                onClick={loadKebutuhanBelanja}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Tampilkan Laporan
                            </button>
                            <button
                                type="button"
                                onClick={previewBelanjaPdf}
                                disabled={pdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: pdfLoading ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF...' : '\uD83D\uDCC4 Preview PDF'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'PER_PERIODE' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLaporanPerPeriode}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Tampilkan Laporan
                            </button>
                            <button
                                type="button"
                                onClick={previewPerPeriodePdf}
                                disabled={pdfLoading || !perPeriodeData}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (pdfLoading || !perPeriodeData) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (pdfLoading || !perPeriodeData) ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF...' : '\uD83D\uDCC4 Preview PDF'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'PER_BULAN' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLaporanPerBulan}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Tampilkan Laporan
                            </button>
                            <button
                                type="button"
                                onClick={previewPerBulanPdf}
                                disabled={pdfLoading || !perBulanData}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (pdfLoading || !perBulanData) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (pdfLoading || !perBulanData) ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF...' : '\uD83D\uDCC4 Preview PDF'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'BTT_OPERASIONAL' || jenisLaporan === 'BTT_SEWA' ? (
                        <>
                            <button
                                type="button"
                                onClick={loadBttData}
                                disabled={bttLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bttLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bttLoading ? 0.65 : 1
                                }}
                            >
                                {bttLoading ? 'Memuat...' : 'Tampilkan Data BTT'}
                            </button>
                            {bttData && (
                                <button
                                    type="button"
                                    onClick={previewBttPdf}
                                    disabled={bttPdfLoading}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: bttPdfLoading ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        opacity: bttPdfLoading ? 0.65 : 1
                                    }}
                                >
                                    {bttPdfLoading ? 'Membuat PDF...' : '\uD83D\uDCC4 Preview PDF BTT'}
                                </button>
                            )}
                        </>
                    ) : null}
                    {jenisLaporan === 'LR' && (
                        <button
                            type="button"
                            onClick={previewLrPdf}
                            disabled={lrLoading}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: lrLoading ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                opacity: lrLoading ? 0.65 : 1
                            }}
                        >
                            {lrLoading ? 'Membuat PDF…' : '\uD83D\uDCC4 Preview PDF LR'}
                        </button>
                    )}
                    {jenisLaporan === 'HARIAN' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLaporanHarian}
                                disabled={harianLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: harianLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: harianLoading ? 0.65 : 1
                                }}
                            >
                                {harianLoading ? 'Memuat…' : 'Tampilkan Laporan'}
                            </button>
                            <button
                                type="button"
                                onClick={previewHarianPdf}
                                disabled={harianPdfLoading || !harianData}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (harianPdfLoading || !harianData) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (harianPdfLoading || !harianData) ? 0.65 : 1
                                }}
                            >
                                {harianPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'BAPSD' && (
                        <>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{
                                    textTransform: 'uppercase',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.07em',
                                    color: 'var(--text-muted)',
                                    display: 'block',
                                    marginBottom: '6px'
                                }}>
                                    Nomor Dokumen
                                </label>
                                <input
                                    type="text"
                                    className="form-field"
                                    placeholder="Contoh: 001/BAPSD/2026"
                                    value={bapsdNomorDokumen}
                                    onChange={e => setBapsdNomorDokumen(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={loadBapsd}
                                disabled={bapsdLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bapsdLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bapsdLoading ? 0.65 : 1
                                }}
                            >
                                {bapsdLoading ? 'Memuat…' : 'Tampilkan BAPSD'}
                            </button>
                            <button
                                type="button"
                                onClick={previewBapsdPdf}
                                disabled={bapsdPdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bapsdPdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bapsdPdfLoading ? 0.65 : 1
                                }}
                            >
                                {bapsdPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF BAPSD'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'SPTJ' && (
                        <>
                            <button
                                type="button"
                                onClick={loadSptj}
                                disabled={sptjLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: sptjLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: sptjLoading ? 0.65 : 1
                                }}
                            >
                                {sptjLoading ? 'Memuat…' : 'Tampilkan SPTJ'}
                            </button>
                            <button
                                type="button"
                                onClick={previewSptjPdf}
                                disabled={sptjPdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: sptjPdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: sptjPdfLoading ? 0.65 : 1
                                }}
                            >
                                {sptjPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF SPTJ'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'LBBP' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLbbp}
                                disabled={lbbpLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: lbbpLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: lbbpLoading ? 0.65 : 1
                                }}
                            >
                                {lbbpLoading ? 'Memuat…' : 'Tampilkan LBBP'}
                            </button>
                            <button
                                type="button"
                                onClick={previewLbbpPdf}
                                disabled={lbbpPdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: lbbpPdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: lbbpPdfLoading ? 0.65 : 1
                                }}
                            >
                                {lbbpPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF LBBP'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'BKK' && (
                        <>
                            <button
                                type="button"
                                onClick={loadBkk}
                                disabled={bkkLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bkkLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bkkLoading ? 0.65 : 1
                                }}
                            >
                                {bkkLoading ? 'Memuat…' : 'Tampilkan BKK'}
                            </button>
                            <button
                                type="button"
                                onClick={previewBkkPdf}
                                disabled={bkkPdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bkkPdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bkkPdfLoading ? 0.65 : 1
                                }}
                            >
                                {bkkPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF BKK'}
                            </button>
                        </>
                    )}
                </div>
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
                <Table
                    columns={[
                        { key: 'tanggal', header: 'Tanggal', align: 'center' },
                        { key: 'noBukti', header: 'No Bukti', align: 'center' },
                        { key: 'uraian', header: 'Uraian' },
                        {
                            key: 'debet',
                            header: 'Debet',
                            align: 'center',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                                </span>
                            )
                        },
                        {
                            key: 'kredit',
                            header: 'Kredit',
                            align: 'center',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                                </span>
                            )
                        },
                        {
                            key: 'saldoBerjalan',
                            header: 'Saldo Berjalan',
                            align: 'center',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        }
                    ]}
                    data={reportData}
                    emptyText="Tidak ada data untuk laporan terpilih pada periode ini."
                />
            )}

            {/* Render 2. Buku Pembantu (4 subtypes) */}
            {!loading && (jenisLaporan === 'BP_KAS' || jenisLaporan === 'BP_BAHAN_BAKU' || jenisLaporan === 'BP_OPERASIONAL' || jenisLaporan === 'BP_FASILITAS') && (
                bpData ? (
                    <div>
                        {/* Summary header */}
                        <div style={{
                            display: 'flex', gap: '24px', flexWrap: 'wrap',
                            marginBottom: '16px', padding: '16px',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)', fontSize: '14px'
                        }}>
                            <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Akun:</span> {bpData.namaAkun}</div>
                            <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Awal:</span> Rp{Number(bpData.saldoAwal).toLocaleString('id-ID')}</div>
                            <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Akhir:</span> <strong>Rp{Number(bpData.saldoAkhir).toLocaleString('id-ID')}</strong></div>
                        </div>
                        <Table
                            columns={[
                                { key: 'tanggal', header: 'Tanggal', align: 'center' },
                                { key: 'noBukti', header: 'No Bukti', align: 'center' },
                                { key: 'uraian', header: 'Uraian' },
                                {
                                    key: 'debet',
                                    header: 'Debet',
                                    align: 'center',
                                    render: (v) => (
                                        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-success)' }}>
                                            {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                                        </span>
                                    )
                                },
                                {
                                    key: 'kredit',
                                    header: 'Kredit',
                                    align: 'center',
                                    render: (v) => (
                                        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-danger)' }}>
                                            {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                                        </span>
                                    )
                                },
                                {
                                    key: 'saldoBerjalan',
                                    header: 'Saldo',
                                    align: 'center',
                                    render: (v) => (
                                        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                                            Rp{Number(v).toLocaleString('id-ID')}
                                        </strong>
                                    )
                                },
                                ...(jenisLaporan !== 'BP_KAS' ? [{
                                    key: 'sumberKas',
                                    header: 'Keterangan',
                                    align: 'center',
                                    render: (v) => <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{v || '—'}</span>
                                }] : [])
                            ]}
                            data={bpData.data || []}
                            emptyText="Tidak ada transaksi pada buku pembantu ini."
                        />
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Tidak ada data. Pastikan setup lembaga dan akun sudah terkonfigurasi.
                    </div>
                )
            )}

            {/* Render Neraca Saldo */}
            {!loading && jenisLaporan === 'NERACA_SALDO' && (
                neracaData ? (
                    <div>
                        {/* Verification badge & PDF Button */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            gap: '12px',
                            marginBottom: '16px',
                            flexWrap: 'wrap'
                        }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px',
                                fontWeight: 600,
                                background: neracaData.verifikasi.danaBiayaCocok
                                    ? 'rgba(34,197,94,0.12)'
                                    : 'rgba(239,68,68,0.12)',
                                border: `1px solid ${neracaData.verifikasi.danaBiayaCocok ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                                color: neracaData.verifikasi.danaBiayaCocok ? '#16a34a' : '#dc2626',
                            }}>
                                {neracaData.verifikasi.pesan}
                            </div>
                            <button
                                type="button"
                                onClick={previewNeracaSaldoPdf}
                                disabled={pdfLoading}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    opacity: pdfLoading ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF...' : '📄 Preview PDF'}
                            </button>
                        </div>
                        <Table
                            columns={[
                                { key: 'kode', header: 'Kode', render: (v) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</span> },
                                { key: 'nama', header: 'Nama Akun' },
                                {
                                    key: 'tipe', header: 'Tipe',
                                    render: (v) => {
                                        const color = { KAS: '#0ea5e9', DANA: '#8b5cf6', BIAYA: '#f97316', PAJAK: '#64748b' }[v] || 'inherit';
                                        return <span style={{ color, fontWeight: 600, fontSize: '12px' }}>{v}</span>;
                                    }
                                },
                                {
                                    key: 'saldoAwal', header: 'Saldo Awal', align: 'center',
                                    render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Number(v) !== 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}</span>
                                },
                                {
                                    key: 'totalDebet', header: 'Total Debet', align: 'center',
                                    render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', color: Number(v) > 0 ? 'var(--color-success)' : 'inherit' }}>{Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}</span>
                                },
                                {
                                    key: 'totalKredit', header: 'Total Kredit', align: 'center',
                                    render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', color: Number(v) > 0 ? 'var(--color-danger)' : 'inherit' }}>{Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}</span>
                                },
                                {
                                    key: 'saldoAkhir', header: 'Saldo Akhir', align: 'center',
                                    render: (v) => <strong style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(v).toLocaleString('id-ID')}</strong>
                                },
                            ]}
                            data={neracaData.akun || []}
                            emptyText="Tidak ada data akun untuk periode ini."
                        />
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Tidak ada data. Pastikan setup lembaga sudah terkonfigurasi.
                    </div>
                )
            )}

            {/* Render 3. Stock Barang Table */}
            {!loading && jenisLaporan === 'STOCK_BARANG' && (
                <Table
                    columns={[
                        { key: 'nama', header: 'Nama Bahan' },
                        { key: 'satuan', header: 'Satuan' },
                        {
                            key: 'saldoAwalQty',
                            header: 'Saldo Awal',
                            align: 'center',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'totalMasukQty',
                            header: 'Total Masuk',
                            align: 'center',
                            render: (v) => (
                                <span style={{ color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    {Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'totalKeluarQty',
                            header: 'Total Keluar',
                            align: 'center',
                            render: (v) => (
                                <span style={{ color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    {Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'saldoAkhirQty',
                            header: 'Saldo Akhir',
                            align: 'center',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    {Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'hargaBeliTerakhir',
                            header: 'Harga Beli Terakhir',
                            align: 'center',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'nilaiStock',
                            header: 'Nilai Stock',
                            align: 'center',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        }
                    ]}
                    data={stockData}
                    emptyText="Tidak ada data stock barang untuk periode dan tanggal terpilih."
                />
            )}

            {/* Render 4. Kebutuhan Belanja Bahan Table */}
            {!loading && jenisLaporan === 'BELANJA_BAHAN' && belanjaData !== null && (
                <Table
                    columns={[
                        { key: 'nama', header: 'Nama Bahan Pokok' },
                        { key: 'satuan', header: 'Satuan' },
                        {
                            key: 'totalBeratKotorGr',
                            header: 'Berat Kotor (kg)',
                            align: 'center',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {(Number(v) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            )
                        },
                        {
                            key: 'totalBeratBersihGr',
                            header: 'Berat Bersih (kg)',
                            align: 'center',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {(Number(v) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            )
                        },
                        {
                            key: 'totalEstimasiBiaya',
                            header: 'Estimasi Biaya',
                            align: 'center',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        }
                    ]}
                    data={belanjaData}
                    emptyText="Tidak ada data kebutuhan belanja bahan untuk periode dan tanggal terpilih."
                />
            )}
            {!loading && jenisLaporan === 'BELANJA_BAHAN' && belanjaData === null && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Silakan tentukan rentang tanggal dan klik "Tampilkan Laporan".
                </p>
            )}

            {/* Render 5. Laporan Per Periode Table */}
            {!loading && jenisLaporan === 'PER_PERIODE' && perPeriodeData !== null && (
                <div>
                    <Table
                        columns={[
                            { key: 'kategori', header: 'Kategori Pos Anggaran' },
                            {
                                key: 'rab',
                                header: 'Anggaran (RAB)',
                                align: 'center',
                                render: (v) => (
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </span>
                                )
                            },
                            {
                                key: 'aktual',
                                header: 'Realisasi (Aktual)',
                                align: 'center',
                                render: (v, row) => (
                                    <span style={{ color: row.isEstimasi ? 'var(--color-primary)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                                        Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}{row.isEstimasi ? ' (estimasi)' : ''}
                                    </span>
                                )
                            },
                            {
                                key: 'selisih',
                                header: 'Selisih (Sisa)',
                                align: 'center',
                                render: (v) => (
                                    <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                        Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </strong>
                                )
                            }
                        ]}
                        data={[
                            {
                                kategori: 'Bahan Makanan (Pendidikan)',
                                rab: perPeriodeData.bahanMakanan.pendidikan.rab,
                                aktual: perPeriodeData.bahanMakanan.pendidikan.aktual,
                                selisih: perPeriodeData.bahanMakanan.pendidikan.selisih,
                                isEstimasi: true
                            },
                            {
                                kategori: 'Bahan Makanan (Posyandu)',
                                rab: perPeriodeData.bahanMakanan.posyandu.rab,
                                aktual: perPeriodeData.bahanMakanan.posyandu.aktual,
                                selisih: perPeriodeData.bahanMakanan.posyandu.selisih,
                                isEstimasi: true
                            },
                            {
                                kategori: 'Biaya Operasional',
                                rab: perPeriodeData.operasional.rab,
                                aktual: perPeriodeData.operasional.aktual,
                                selisih: perPeriodeData.operasional.selisih,
                                isEstimasi: false
                            },
                            {
                                kategori: 'Biaya Insentif Fasilitas',
                                rab: perPeriodeData.insentifFasilitas.rab,
                                aktual: perPeriodeData.insentifFasilitas.aktual,
                                selisih: perPeriodeData.insentifFasilitas.selisih,
                                isEstimasi: false
                            }
                        ]}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '12px' }}>
                        * Catatan: Realisasi Bahan Makanan untuk Pendidikan &amp; Posyandu dihitung menggunakan metode alokasi proporsional berdasarkan rasio RAB (PROPORSIONAL_RAB).
                    </p>
                </div>
            )}
            {!loading && jenisLaporan === 'PER_PERIODE' && perPeriodeData === null && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Silakan klik tombol "Tampilkan Laporan" untuk memuat data.
                </p>
            )}

            {/* Render 6. Laporan Per Bulan Table */}
            {!loading && jenisLaporan === 'PER_BULAN' && perBulanData !== null && (
                <Table
                    columns={[
                        {
                            key: 'month',
                            header: 'Bulan',
                            render: (_, row) => formatIndoMonth(row.year, row.month)
                        },
                        {
                            key: 'totalMasuk',
                            header: 'Total Masuk',
                            align: 'center',
                            render: (v) => (
                                <span style={{ color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </span>
                            )
                        },
                        {
                            key: 'totalKeluar',
                            header: 'Total Keluar',
                            align: 'center',
                            render: (v) => (
                                <span style={{ color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </span>
                            )
                        },
                        {
                            key: 'key',
                            header: 'Saldo Bersih',
                            align: 'center',
                            render: (_, row) => {
                                const saldoBersih = row.totalMasuk - row.totalKeluar;
                                return (
                                    <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                        Rp{saldoBersih.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </strong>
                                );
                            }
                        }
                    ]}
                    data={perBulanData}
                    emptyText="Tidak ada data kas bulanan untuk periode terpilih."
                />
            )}
            {!loading && jenisLaporan === 'PER_BULAN' && perBulanData === null && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Silakan klik tombol "Tampilkan Laporan" untuk memuat data.
                </p>
            )}

            {/* Render 7. Laporan Harian */}
            {!harianLoading && jenisLaporan === 'HARIAN' && harianData && (
                <div>
                    <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ margin: '4px 0' }}><strong>Menu:</strong> {harianData.menuDescription || '\u2014'}</p>
                        <p style={{ margin: '4px 0' }}><strong>Total Penerima:</strong> {harianData.totalPenerima} orang</p>
                    </div>

                    <h4 style={{ marginBottom: '8px' }}>Penerima Manfaat</h4>
                    <Table
                        columns={[
                            { key: 'kategori', header: 'Kategori' },
                            { key: 'lakiLaki', header: 'Laki-laki', align: 'center' },
                            { key: 'perempuan', header: 'Perempuan', align: 'center' },
                            { key: 'total', header: 'Total', align: 'center' }
                        ]}
                        data={harianData.penerimaManfaat}
                        emptyText="Tidak ada data penerima manfaat untuk hari ini."
                    />

                    <h4 style={{ marginTop: '24px', marginBottom: '8px' }}>Belanja</h4>
                    {harianData.belanja.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Tidak ada belanja untuk tanggal ini.</p>
                    ) : (
                        harianData.belanja.map(po => (
                            <div key={po.poId} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                <p style={{ margin: '4px 0', fontWeight: 600 }}>
                                    Supplier: {po.supplier} | Status: {po.status} | Total: Rp{po.totalBelanja.toLocaleString('id-ID')}
                                </p>
                                <Table
                                    columns={[
                                        { key: 'bahan', header: 'Bahan' },
                                        { key: 'qty', header: 'Qty', align: 'center', render: (v) => Number(v).toLocaleString('id-ID', { minimumFractionDigits: 2 }) },
                                        { key: 'satuan', header: 'Satuan' },
                                        { key: 'hargaSatuan', header: 'Harga', align: 'center', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` },
                                        { key: 'subtotal', header: 'Subtotal', align: 'center', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` }
                                    ]}
                                    data={po.items}
                                />
                            </div>
                        ))
                    )}

                    <h4 style={{ marginTop: '24px', marginBottom: '8px' }}>Biaya</h4>
                    <Table
                        columns={[
                            { key: 'nomorBukti', header: 'No Bukti' },
                            { key: 'uraian', header: 'Uraian' },
                            { key: 'akunDanaBiaya', header: 'Akun Biaya' },
                            { key: 'nominal', header: 'Nominal', align: 'center', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` }
                        ]}
                        data={harianData.biaya}
                        emptyText="Tidak ada biaya untuk tanggal ini."
                    />

                    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <p style={{ margin: '4px 0' }}><strong>Total Belanja:</strong> Rp{harianData.totalBelanja.toLocaleString('id-ID')}</p>
                        <p style={{ margin: '4px 0' }}><strong>Total Biaya Keluar:</strong> Rp{harianData.totalBiayaKeluar.toLocaleString('id-ID')}</p>
                        <p style={{ margin: '4px 0', fontWeight: 700 }}>
                            <strong>Grand Total:</strong> Rp{(harianData.totalBelanja + harianData.totalBiayaKeluar).toLocaleString('id-ID')}
                        </p>
                    </div>
                </div>
            )}
            {!harianLoading && jenisLaporan === 'HARIAN' && !harianData && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Pilih tanggal dan klik &quot;Tampilkan Laporan&quot; untuk memuat data.
                </p>
            )}

            {!loading && jenisLaporan === 'LR' && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Pilih periode dan klik &quot;Preview PDF LR&quot; untuk menampilkan laporan.
                </p>
            )}

            {/* Render 10. LRA Multi-Periode */}
            {!lraLoading && jenisLaporan === 'LRA' && lraData && (() => {
                const katMap = {
                    BAHAN_MAKANAN: 'Bahan Makanan',
                    OPERASIONAL: 'Operasional',
                    INSENTIF_FASILITAS: 'Insentif / Fasilitas'
                };
                const categories = ['BAHAN_MAKANAN', 'OPERASIONAL', 'INSENTIF_FASILITAS'];
                const byKat = Object.fromEntries(lraData.kategoriSummary.map(r => [r.kategori, r]));
                const totalRow = byKat['TOTAL'] || lraData.kategoriSummary.find(r => r.isTotal) || {};

                return (
                    <>
                        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                        <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'left' }}></th>
                                        {categories.map(kat => (
                                            <th key={kat} colSpan={3} style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                                {katMap[kat]}
                                            </th>
                                        ))}
                                        <th colSpan={3} style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center', borderLeft: '2px solid var(--border)' }}>
                                            Total Keseluruhan
                                        </th>
                                    </tr>
                                    <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                        <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}></th>
                                        {categories.map(kat => (
                                            <React.Fragment key={kat}>
                                                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>RAB</th>
                                                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center' }}>Realisasi</th>
                                                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center' }}>%</th>
                                            </React.Fragment>
                                        ))}
                                        <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center', borderLeft: '2px solid var(--border)' }}>Total RAB</th>
                                        <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center' }}>Total Realisasi</th>
                                        <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center' }}>% Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lraData.periodeList.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{p.label}</td>
                                            {categories.map(kat => {
                                                const row = byKat[kat] || {};
                                                const rab = row[`rab_${p.id}`] || 0;
                                                const aktual = row[`aktual_${p.id}`] || 0;
                                                const persen = row[`persen_${p.id}`] || 0;
                                                return (
                                                    <React.Fragment key={kat}>
                                                        <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: '1px solid var(--border)', textAlign: 'center', borderLeft: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>
                                                            Rp{rab.toLocaleString('id-ID')}
                                                        </td>
                                                        <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                                            Rp{aktual.toLocaleString('id-ID')}
                                                        </td>
                                                        <td style={{
                                                            padding: '16px 18px', fontSize: 14, borderBottom: '1px solid var(--border)', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                                                            color: persen >= 90 ? 'var(--color-success)' : persen >= 60 ? '#d97706' : 'var(--color-danger)'
                                                        }}>
                                                            {persen.toFixed(1)}%
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                            {(() => {
                                                const rab = totalRow[`rab_${p.id}`] || 0;
                                                const aktual = totalRow[`aktual_${p.id}`] || 0;
                                                const persen = totalRow[`persen_${p.id}`] || 0;
                                                return (
                                                    <React.Fragment>
                                                        <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: '1px solid var(--border)', textAlign: 'center', borderLeft: '2px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>
                                                            Rp{rab.toLocaleString('id-ID')}
                                                        </td>
                                                        <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                                            Rp{aktual.toLocaleString('id-ID')}
                                                        </td>
                                                        <td style={{
                                                            padding: '16px 18px', fontSize: 14, borderBottom: '1px solid var(--border)', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                                                            color: persen >= 90 ? 'var(--color-success)' : persen >= 60 ? '#d97706' : 'var(--color-danger)'
                                                        }}>
                                                            {persen.toFixed(1)}%
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })()}
                                        </tr>
                                    ))}
                                    <tr style={{ fontWeight: 700, backgroundColor: 'var(--bg-elevated)' }}>
                                        <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: 'none' }}>TOTAL</td>
                                        {categories.map(kat => {
                                            const row = byKat[kat] || {};
                                            const rab = row.totalRAB || 0;
                                            const aktual = row.totalAktual || 0;
                                            const persen = row.totalPersen || 0;
                                            return (
                                                <React.Fragment key={kat}>
                                                    <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: 'none', textAlign: 'center', borderLeft: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>
                                                        Rp{rab.toLocaleString('id-ID')}
                                                    </td>
                                                    <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: 'none', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                                        Rp{aktual.toLocaleString('id-ID')}
                                                    </td>
                                                    <td style={{
                                                        padding: '16px 18px', fontSize: 14, borderBottom: 'none', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                                                        color: persen >= 90 ? 'var(--color-success)' : persen >= 60 ? '#d97706' : 'var(--color-danger)'
                                                    }}>
                                                        {persen.toFixed(1)}%
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}
                                        {(() => {
                                            const rab = totalRow.totalRAB || 0;
                                            const aktual = totalRow.totalAktual || 0;
                                            const persen = totalRow.totalPersen || 0;
                                            return (
                                                <React.Fragment>
                                                    <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: 'none', textAlign: 'center', borderLeft: '2px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>
                                                        Rp{rab.toLocaleString('id-ID')}
                                                    </td>
                                                    <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: 'none', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                                        Rp{aktual.toLocaleString('id-ID')}
                                                    </td>
                                                    <td style={{
                                                        padding: '16px 18px', fontSize: 14, borderBottom: 'none', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                                                        color: persen >= 90 ? 'var(--color-success)' : persen >= 60 ? '#d97706' : 'var(--color-danger)'
                                                    }}>
                                                        {persen.toFixed(1)}%
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })()}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        {lraData?.pendingTransfer && (
                            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '6px', fontSize: '13px', color: '#8c6b00' }}>
                                ⚠️ <strong>Catatan:</strong> Realisasi pendapatan {lraData.ringkasan?.totalPendapatan?.realisasi === 0 ? 'Rp 0' : `Rp ${(lraData.ringkasan?.totalPendapatan?.realisasi || 0).toLocaleString('id-ID')}`} — dana BGN belum tercatat masuk (pending transfer).
                            </div>
                        )}
                    </>
                );
            })()}
            {!lraLoading && jenisLaporan === 'LRA' && !lraData && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Pilih minimal 2 periode di atas dan klik "Tampilkan LRA".
                </p>
            )}

            {/* Render 11. LPD2M Multi-Periode */}
            {jenisLaporan === 'LPD2M' && (
                <div style={{
                    marginTop: '20px',
                    marginBottom: '20px',
                    padding: '16px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card, #ffffff)'
                }}>
                    <div style={{ marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                            📎 Bukti LPD2M (Opsional — bisa kosong)
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Upload bukti pembayaran/transfer per periode. Saat generate PDF, berkas ini akan di-embed ke PDF lalu otomatis dihapus.
                        </span>
                    </div>

                    {/* Form Upload Bukti */}
                    <form onSubmit={handleUploadBukti} style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        alignItems: 'flex-end',
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: 'var(--bg, #f8fafc)',
                        borderRadius: '6px',
                        border: '1px dashed var(--border)'
                    }}>
                        {selectedPeriodeIds.length > 1 && (
                            <div style={{ flex: '1 1 180px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    Target Periode
                                </label>
                                <select
                                    value={targetBuktiPeriodeId}
                                    onChange={(e) => setTargetBuktiPeriodeId(e.target.value)}
                                    className="form-field"
                                    style={{ width: '100%', fontSize: '13px' }}
                                >
                                    {selectedPeriodeIds.map(id => {
                                        const p = periods.find(item => item.id === id);
                                        return (
                                            <option key={id} value={id}>
                                                {p ? `${p.tanggalMulai} - ${p.tanggalSelesai}` : id}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                Nama Bukti
                            </label>
                            <input
                                type="text"
                                placeholder="Contoh: Kuitansi Pembelian / SP2D"
                                value={namaBuktiInput}
                                onChange={(e) => setNamaBuktiInput(e.target.value)}
                                className="form-field"
                                style={{ width: '100%', fontSize: '13px' }}
                            />
                        </div>
                        <div style={{ flex: '1 1 150px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                Jenis Bukti
                            </label>
                            <select
                                value={jenisBuktiInput}
                                onChange={(e) => setJenisBuktiInput(e.target.value)}
                                className="form-field"
                                style={{ width: '100%', fontSize: '13px' }}
                            >
                                <option value="BUKTI_TRANSFER">Bukti Transfer</option>
                                <option value="KUITANSI">Kuitansi</option>
                                <option value="SP2D">SP2D</option>
                                <option value="LAINNYA">Lainnya</option>
                            </select>
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                Pilih File (Image / PDF)
                            </label>
                            <input
                                id="input-file-bukti-lpd2m"
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => setFileBuktiInput(e.target.files[0] || null)}
                                className="form-field"
                                style={{ width: '100%', fontSize: '12px' }}
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={uploadingBukti}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--btn-primary-bg, #2563eb)',
                                    color: 'var(--btn-primary-text, #ffffff)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm, 4px)',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: uploadingBukti ? 'not-allowed' : 'pointer',
                                    opacity: uploadingBukti ? 0.7 : 1
                                }}
                            >
                                {uploadingBukti ? 'Uploading…' : '📤 Upload Bukti'}
                            </button>
                        </div>
                    </form>

                    {/* List Bukti */}
                    <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>
                            Daftar Bukti Terupload ({buktiLpd2mList.length})
                        </h4>
                        {buktiLoading ? (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Memuat bukti…</p>
                        ) : buktiLpd2mList.length === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                                Belum ada bukti yang diupload untuk periode ini (opsional — PDF tetap dapat digenerate tanpa lampiran).
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {buktiLpd2mList.map((b) => (
                                    <div
                                        key={b.id}
                                        style={{
                                            display: 'flex',
                                            justify: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            backgroundColor: 'var(--bg, #f1f5f9)',
                                            borderRadius: '4px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 600, marginRight: '8px' }}>{b.namaBukti}</span>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '2px 6px',
                                                backgroundColor: 'var(--border, #cbd5e1)',
                                                borderRadius: '4px',
                                                marginRight: '8px'
                                            }}>
                                                {b.jenis}
                                            </span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {new Date(b.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteBukti(b.id)}
                                            style={{
                                                padding: '4px 8px',
                                                backgroundColor: '#ef4444',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🗑️ Hapus
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!lpd2mLoading && jenisLaporan === 'LPD2M' && lpd2mData && (
                <Table
                    columns={[
                        { key: 'periodeLabel', header: 'Periode' },
                        {
                            key: 'saldoAwal', header: 'Saldo Awal', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(v).toLocaleString('id-ID')}</span>
                        },
                        {
                            key: 'penerimaan', header: 'Penerimaan', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-success)' }}>Rp{Number(v).toLocaleString('id-ID')}</span>
                        },
                        {
                            key: 'pengeluaran', header: 'Pengeluaran', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-danger)' }}>Rp{Number(v).toLocaleString('id-ID')}</span>
                        },
                        {
                            key: 'saldoAkhir', header: 'Saldo Akhir', align: 'center',
                            render: (v) => <strong style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(v).toLocaleString('id-ID')}</strong>
                        },
                        {
                            key: 'totalRAB', header: 'Pagu (RAB)', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(v).toLocaleString('id-ID')}</span>
                        },
                        {
                            key: 'totalRealisasi', header: 'Realisasi', align: 'center',
                            render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(v).toLocaleString('id-ID')}</span>
                        },
                        {
                            key: 'persenPenyerapan', header: '% Penyerapan', align: 'center',
                            render: (v) => (
                                <strong style={{
                                    fontVariantNumeric: 'tabular-nums',
                                    color: v >= 90 ? 'var(--color-success)' : v >= 60 ? '#d97706' : 'var(--color-danger)'
                                }}>
                                    {Number(v).toFixed(1)}%
                                </strong>
                            )
                        }
                    ]}
                    data={lpd2mData.periodeData || []}
                    emptyText="Tidak ada data perkembangan dana untuk periode terpilih."
                />
            )}
            {!lpd2mLoading && jenisLaporan === 'LPD2M' && lpd2mData?.pendingTransfer && (
                <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '6px', fontSize: '13px', color: '#8c6b00' }}>
                    ⚠️ <strong>Catatan:</strong> Realisasi penerimaan dana belum tercatat masuk di jurnal transaksi (pending transfer).
                </div>
            )}
            {!lpd2mLoading && jenisLaporan === 'LPD2M' && !lpd2mData && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Pilih periode di atas dan klik "Tampilkan LPD2M".
                </p>
            )}

            {/* Render 12. BTT */}
            {!bttLoading && (jenisLaporan === 'BTT_OPERASIONAL' || jenisLaporan === 'BTT_SEWA') && bttData && (
                <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <h4>BUKTI TANDA TERIMA</h4>
                    <p>Nomor: {bttData.nomorDokumen}</p>
                    <p>Nominal: Rp {Number(bttData.nominal).toLocaleString('id-ID')}</p>
                    <p>Terbilang: {bttData.terbilang}</p>
                    <p>Keperluan: {bttData.keperluan}</p>
                    <p>Penerima: {bttData.mitraNama}</p>
                </div>
            )}
            {!bttLoading && (jenisLaporan === 'BTT_OPERASIONAL' || jenisLaporan === 'BTT_SEWA') && !bttData && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Klik "Tampilkan Data BTT" untuk memuat data.
                </p>
            )}

            {/* Render BAPSD */}
            {!loading && jenisLaporan === 'BAPSD' && (
                bapsdData ? (
                    <div style={{
                        padding: '24px',
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Berita Acara Pengalihan Sisa Dana (BAPSD)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Nomor Dokumen:</span> <strong>{bapsdData.nomorDokumen || '—'}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Periode:</span> <strong>{bapsdData.periodeLabel}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Lembaga:</span> <strong>{bapsdData.namaLembaga}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Sisa Dana:</span> <strong style={{ color: 'var(--color-primary)' }}>Rp{Number(bapsdData.sisaDana || 0).toLocaleString('id-ID')}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Pejabat:</span> <strong>{bapsdData.namaPejabat}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Akuntan:</span> <strong>{bapsdData.namaAkuntan}</strong></div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Tekan "Tampilkan BAPSD" untuk memuat data.
                    </div>
                )
            )}

            {/* Render SPTJ */}
            {!loading && jenisLaporan === 'SPTJ' && (
                sptjData ? (
                    <div style={{
                        padding: '24px',
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Surat Pernyataan Tanggung Jawab (SPTJ)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Lembaga:</span> <strong>{sptjData.namaLembaga}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Pejabat:</span> <strong>{sptjData.namaPejabat} ({sptjData.jabatan})</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Jumlah Penerimaan:</span> <strong>Rp{Number(sptjData.jumlahPenerimaan || 0).toLocaleString('id-ID')}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Jumlah Pengeluaran:</span> <strong>Rp{Number(sptjData.jumlahPengeluaran || 0).toLocaleString('id-ID')}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Sisa Dana:</span> <strong style={{ color: 'var(--color-primary)' }}>Rp{Number(sptjData.sisaDana || 0).toLocaleString('id-ID')}</strong></div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Tekan "Tampilkan SPTJ" untuk memuat data.
                    </div>
                )
            )}

            {/* Render LBBP */}
            {!loading && jenisLaporan === 'LBBP' && (
                lbbpData ? (
                    <div>
                        {/* Summary card */}
                        <div style={{
                            padding: '16px 24px',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '16px',
                            display: 'flex',
                            gap: '32px',
                            flexWrap: 'wrap',
                            fontSize: '14px'
                        }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Periode:</span>{' '}
                                {lbbpData.periodeLabel}
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Lembaga:</span>{' '}
                                {lbbpData.lembaga?.namaLembaga || '—'}
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Belanja:</span>{' '}
                                <strong style={{ color: 'var(--color-primary)' }}>
                                    Rp{Number(lbbpData.grandTotal || 0).toLocaleString('id-ID')}
                                </strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Jumlah PO Terealisasi:</span>{' '}
                                {lbbpData.grupTanggal?.reduce((s, g) => s + g.rows.length, 0) || 0} item
                            </div>
                        </div>

                        {/* Table per tanggal */}
                        {lbbpData.grupTanggal && lbbpData.grupTanggal.length > 0 ? (
                            lbbpData.grupTanggal.map((grup, gi) => {
                                const subtotalGrup = grup.rows.reduce((s, r) => s + Number(r.subtotal || 0), 0);
                                const tglFormatted = (() => {
                                    try {
                                        return new Date(grup.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
                                    } catch { return grup.tanggal; }
                                })();
                                return (
                                    <div key={gi} style={{ marginBottom: '24px' }}>
                                        <div style={{
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            color: 'var(--text)',
                                            padding: '8px 12px',
                                            backgroundColor: 'var(--bg-elevated)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                                            borderBottom: 'none'
                                        }}>
                                            📅 {tglFormatted}
                                        </div>
                                        <Table
                                            columns={[
                                                { key: 'no', header: 'No', align: 'center', render: (_, __, idx) => idx + 1 },
                                                { key: 'noPO', header: 'No. PO', align: 'center' },
                                                { key: 'supplier', header: 'Supplier' },
                                                { key: 'namaBahan', header: 'Nama Bahan' },
                                                { key: 'satuan', header: 'Satuan', align: 'center' },
                                                {
                                                    key: 'qty',
                                                    header: 'Qty',
                                                    align: 'right',
                                                    render: (v) => Number(v).toLocaleString('id-ID', { maximumFractionDigits: 3 })
                                                },
                                                {
                                                    key: 'hargaSatuan',
                                                    header: 'Harga Satuan',
                                                    align: 'right',
                                                    render: (v) => `Rp${Number(v).toLocaleString('id-ID')}`
                                                },
                                                {
                                                    key: 'subtotal',
                                                    header: 'Subtotal',
                                                    align: 'right',
                                                    render: (v) => <strong>Rp{Number(v).toLocaleString('id-ID')}</strong>
                                                },
                                                {
                                                    key: 'status',
                                                    header: 'Status',
                                                    align: 'center',
                                                    render: (v) => (
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            backgroundColor: v === 'DITERIMA' ? '#dcfce7' : '#fef9c3',
                                                            color: v === 'DITERIMA' ? '#15803d' : '#854d0e'
                                                        }}>
                                                            {v}
                                                        </span>
                                                    )
                                                }
                                            ]}
                                            data={grup.rows}
                                            emptyText="Tidak ada item."
                                        />
                                        <div style={{
                                            textAlign: 'right',
                                            padding: '8px 16px',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            backgroundColor: 'var(--bg-elevated)',
                                            border: '1px solid var(--border)',
                                            borderTop: 'none',
                                            borderRadius: '0 0 var(--radius-sm) var(--radius-sm)'
                                        }}>
                                            Subtotal {tglFormatted}:{' '}
                                            <span style={{ color: 'var(--color-primary)' }}>
                                                Rp{subtotalGrup.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                Tidak ada data belanja bahan pokok yang terealisasi pada periode ini.
                            </div>
                        )}

                        {/* Grand Total */}
                        {lbbpData.grupTanggal && lbbpData.grupTanggal.length > 0 && (
                            <div style={{
                                textAlign: 'right',
                                padding: '12px 20px',
                                fontSize: '15px',
                                fontWeight: 700,
                                backgroundColor: '#1e3a5f',
                                color: '#fff',
                                borderRadius: 'var(--radius-md)',
                                marginTop: '8px'
                            }}>
                                TOTAL KESELURUHAN:{' '}
                                Rp{Number(lbbpData.grandTotal || 0).toLocaleString('id-ID')}
                            </div>
                        )}
                    </div>
                ) : (
                    lbbpLoading ? null : (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Tekan &quot;Tampilkan LBBP&quot; untuk memuat data.
                        </div>
                    )
                )
            )}

            {/* Render BKK */}
            {!loading && jenisLaporan === 'BKK' && (
                bkkData ? (
                    <div>
                        {/* Summary card */}
                        <div style={{
                            padding: '16px 24px',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '16px',
                            display: 'flex',
                            gap: '32px',
                            flexWrap: 'wrap',
                            fontSize: '14px'
                        }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Periode:</span>{' '}
                                {bkkData.periodeLabel}
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Lembaga:</span>{' '}
                                {bkkData.lembaga?.namaLembaga || '—'}
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Awal:</span>{' '}
                                <strong>Rp{Number(bkkData.saldoAwal || 0).toLocaleString('id-ID')}</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Penerimaan:</span>{' '}
                                <strong style={{ color: '#15803d' }}>Rp{Number(bkkData.totalPenerimaan || 0).toLocaleString('id-ID')}</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Pengeluaran:</span>{' '}
                                <strong style={{ color: '#dc2626' }}>Rp{Number(bkkData.totalPengeluaran || 0).toLocaleString('id-ID')}</strong>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Akhir:</span>{' '}
                                <strong style={{ color: 'var(--color-primary)' }}>Rp{Number(bkkData.saldoAkhir || 0).toLocaleString('id-ID')}</strong>
                            </div>
                        </div>

                        {/* BKK Table */}
                        <Table
                            columns={[
                                { key: 'no', header: 'No', align: 'center', render: (_, __, idx) => idx + 1 },
                                {
                                    key: 'tanggal',
                                    header: 'Tanggal',
                                    align: 'center',
                                    render: (v) => {
                                        try { return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); }
                                        catch { return v; }
                                    }
                                },
                                { key: 'noBukti', header: 'No. Bukti', align: 'center' },
                                { key: 'uraian', header: 'Uraian' },
                                {
                                    key: 'jenisPengeluaran',
                                    header: 'Jenis Pengeluaran',
                                    align: 'center',
                                    render: (v) => (
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            backgroundColor: v === 'Pengisian Kas' ? '#dcfce7' :
                                                v === 'Transport' ? '#dbeafe' :
                                                v === 'ATK' ? '#fef9c3' :
                                                v === 'Konsumsi' ? '#fce7f3' :
                                                v === 'Pemeliharaan' ? '#ffedd5' :
                                                '#e8edf5',
                                            color: v === 'Pengisian Kas' ? '#15803d' :
                                                v === 'Transport' ? '#1d4ed8' :
                                                v === 'ATK' ? '#854d0e' :
                                                v === 'Konsumsi' ? '#9d174d' :
                                                v === 'Pemeliharaan' ? '#c2410c' :
                                                '#1e3a5f'
                                        }}>
                                            {v}
                                        </span>
                                    )
                                },
                                {
                                    key: 'penerimaan',
                                    header: 'Penerimaan',
                                    align: 'right',
                                    render: (v) => Number(v) > 0
                                        ? <strong style={{ color: '#15803d' }}>Rp{Number(v).toLocaleString('id-ID')}</strong>
                                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                },
                                {
                                    key: 'pengeluaran',
                                    header: 'Pengeluaran',
                                    align: 'right',
                                    render: (v) => Number(v) > 0
                                        ? <strong style={{ color: '#dc2626' }}>Rp{Number(v).toLocaleString('id-ID')}</strong>
                                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                },
                                {
                                    key: 'saldo',
                                    header: 'Saldo',
                                    align: 'right',
                                    render: (v) => <strong>Rp{Number(v).toLocaleString('id-ID')}</strong>
                                }
                            ]}
                            data={bkkData.rows}
                            emptyText="Tidak ada transaksi kas kecil pada periode ini."
                        />

                        {/* Grand Total */}
                        {bkkData.rows && bkkData.rows.length > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '24px',
                                padding: '12px 20px',
                                fontSize: '14px',
                                fontWeight: 700,
                                backgroundColor: '#1e3a5f',
                                color: '#fff',
                                borderRadius: 'var(--radius-md)',
                                marginTop: '8px',
                                flexWrap: 'wrap'
                            }}>
                                <span>Total Penerimaan: Rp{Number(bkkData.totalPenerimaan || 0).toLocaleString('id-ID')}</span>
                                <span>Total Pengeluaran: Rp{Number(bkkData.totalPengeluaran || 0).toLocaleString('id-ID')}</span>
                                <span>Saldo Akhir: Rp{Number(bkkData.saldoAkhir || 0).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    bkkLoading ? null : (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Tekan &quot;Tampilkan BKK&quot; untuk memuat data.
                        </div>
                    )
                )
            )}

            {/* PDF Preview Modal */}
            {isPdfModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                }}>
                    <div style={{
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
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                                {pdfModalTitle}
                            </h3>
                            <button 
                                onClick={() => {
                                    setIsPdfModalOpen(false);
                                    if (pdfUrl) {
                                        URL.revokeObjectURL(pdfUrl);
                                        setPdfUrl('');
                                    }
                                }} 
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    padding: '0 8px'
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} title="PDF Preview" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    setIsPdfModalOpen(false);
                                    if (pdfUrl) {
                                        URL.revokeObjectURL(pdfUrl);
                                        setPdfUrl('');
                                    }
                                }} 
                                className="btn-secondary"
                                style={{
                                    padding: '10px 20px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    backgroundColor: 'transparent',
                                    color: 'var(--text)'
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
