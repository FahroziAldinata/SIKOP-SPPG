import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { PeriodSelector } from '../../components/akuntan/rabHarian/PeriodSelector';
import { RingkasanAnggaranCards } from '../../components/akuntan/rabHarian/RingkasanAnggaranCards';
import { TabBar } from '../../components/akuntan/rabHarian/TabBar';
import { RabPreviewSection } from '../../components/akuntan/rabHarian/RabPreviewSection';
import { KonversiSatuanBox } from '../../components/akuntan/rabHarian/KonversiSatuanBox';
import { RabHarianList } from '../../components/akuntan/rabHarian/RabHarianList';
import { RabP12RekapSection } from '../../components/akuntan/rabHarian/RabP12RekapSection';
import { AnggaranForm } from '../../components/akuntan/rabHarian/AnggaranForm';
import { AnggaranList } from '../../components/akuntan/rabHarian/AnggaranList';
import { RabP12PdfModal } from '../../components/akuntan/rabHarian/RabP12PdfModal';

export const RabHarianPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [tab, setTab] = useState(window.location.pathname.includes('anggaran') ? 'anggaran' : 'rab');

    // Shared
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');

    // RAB-specific
    const [tanggalInput, setTanggalInput] = useState('');
    const [rabList, setRabList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingRabId, setPendingRabId] = useState(null);
    const [kebutuhanHitungan, setKebutuhanHitungan] = useState([]);

    // RAB Preview (new design — ingredient review)
    const [rabPreview, setRabPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [rabItems, setRabItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // RAB P12
    const [rabP12Harian, setRabP12Harian] = useState(null);
    const [rabP12Rekap, setRabP12Rekap] = useState([]);
    const [loadingP12, setLoadingP12] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

    // Anggaran-specific
    const [anggaranList, setAnggaranList] = useState([]);
    const [anggaranLoading, setAnggaranLoading] = useState(false);
    const [anggaranForm, setAnggaranForm] = useState({
        tanggal: '', kategoriDana: '', totalAnggaran: '', keterangan: ''
    });
    const [ringkasanAnggaran, setRingkasanAnggaran] = useState([]);
    const [ringkasanLoading, setRingkasanLoading] = useState(false);
    const [totalRingkasan, setTotalRingkasan] = useState(null);

    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode'));

    }, []);

    // ─── RAB ───

    const loadRabHarian = async (pid) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/akuntan/rab-harian?periodeId=${pid}`);
            if (r.ok) {
                setRabList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar RAB Harian' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (periodeId) { loadRabHarian(periodeId); }
    }, [periodeId]);

    useEffect(() => {
        if (!tanggalInput || !periodeId) {
            setKebutuhanHitungan([]);
            return;
        }
        request(`/akuntan/kebutuhan-hitungan?periodeId=${periodeId}&tanggal=${tanggalInput}`)
            .then(r => r.json())
            .then(d => {
                setKebutuhanHitungan((d.success && d.data) || []);
            })
            .catch(() => setKebutuhanHitungan([]));
    }, [tanggalInput, periodeId]);

    // Preview: Fetch ingredient data from MenuHarian DISETUJUI
    useEffect(() => {
        if (!tanggalInput || !periodeId) {
            setRabPreview(null);
            setRabItems([]);
            return;
        }
        setPreviewLoading(true);
        request(`/akuntan/rab-harian/preview?periodeId=${periodeId}&tanggal=${tanggalInput}`)
            .then(r => r.json())
            .then(d => {
                if (d.success && d.data) {
                    setRabPreview(d.data);
                    if (d.data.tersedia) {
                        setRabItems(d.data.items.map(i => ({ ...i, _hargaInput: i.hargaSatuan })));
                    } else {
                        setRabItems([]);
                    }
                } else {
                    setRabPreview(null);
                    setRabItems([]);
                }
            })
            .catch(() => {
                setRabPreview(null);
                setRabItems([]);
            })
            .finally(() => setPreviewLoading(false));
    }, [tanggalInput, periodeId]);

    // P12: Fetch pagu harian per perubahan tanggalInput & periodeId
    useEffect(() => {
        if (!tanggalInput || !periodeId) {
            setRabP12Harian(null);
            return;
        }
        request(`/akuntan/rab-p12/harian?periodeId=${periodeId}&tanggal=${tanggalInput}`)
            .then(r => r.json())
            .then(d => {
                if (d.success && d.data) {
                    setRabP12Harian(d.data);
                } else {
                    setRabP12Harian(null);
                }
            })
            .catch(() => setRabP12Harian(null));
    }, [tanggalInput, periodeId]);

    // P12: Fetch rekap periode per perubahan periodeId
    useEffect(() => {
        if (!periodeId) {
            setRabP12Rekap([]);
            return;
        }
        setLoadingP12(true);
        request(`/akuntan/rab-p12/rekap?periodeId=${periodeId}`)
            .then(r => r.json())
            .then(d => {
                if (d.success && d.data?.rekap) {
                    setRabP12Rekap(d.data.rekap);
                } else {
                    setRabP12Rekap([]);
                }
            })
            .catch(() => setRabP12Rekap([]))
            .finally(() => setLoadingP12(false));
    }, [periodeId]);

    const previewRabP12Pdf = async (targetTanggal) => {
        const tgl = targetTanggal || tanggalInput;
        if (!periodeId) {
            toast.error('Periode wajib dipilih');
            return;
        }
        if (!tgl) {
            toast.error('Pilih tanggal terlebih dahulu');
            return;
        }
        setPdfLoading(true);
        try {
            const r = await request(`/akuntan/rab-p12/pdf?periodeId=${periodeId}&tanggal=${tgl}`);
            if (r.ok) {
                const blob = new Blob([await r.blob()], { type: 'application/pdf' });
                const objectUrl = URL.createObjectURL(blob);
                setPdfUrl(objectUrl);
                setIsPdfModalOpen(true);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat PDF RAB P12' }));
                toast.error(d.error || 'Gagal membuat PDF RAB P12');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setPdfLoading(false);
        }
    };

    const activePeriod = periods.find(p => p.id === periodeId);

    const triggerAjukan = (id) => {
        setPendingRabId(id);
        setConfirmOpen(true);
    };

    const handleAjukan = async () => {
        if (!pendingRabId) return;
        setConfirmOpen(false);
        try {
            const r = await request(`/akuntan/rab-harian/${pendingRabId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'DIAJUKAN' })
            });
            if (r.ok) {
                toast.success('RAB Harian berhasil diajukan ke Kepala SPPG.');
                loadRabHarian(periodeId);
            } else {
                const err = await r.json().catch(() => ({ error: 'Gagal mengajukan RAB Harian' }));
                toast.error(err.error || 'Gagal mengajukan RAB Harian');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setPendingRabId(null);
        }
    };

    const handlePriceChange = (bahanPokokId, newPrice) => {
        setRabItems(prev => prev.map(item =>
            item.bahanPokokId === bahanPokokId
                ? { ...item, _hargaInput: newPrice, hargaSatuan: newPrice, subtotal: Math.round(item.qtyTotal * newPrice * 100) / 100 }
                : item
        ));
    };

    const verifyRab = async (id) => {
        try {
            const r = await request(`/akuntan/rab-harian/${id}/verify`, { method: 'PUT' });
            if (r.ok) {
                toast.success('RAB diverifikasi. Silakan ajukan ke Kepala SPPG.');
                loadRabHarian(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal verifikasi RAB' }));
                toast.error(d.error || 'Gagal verifikasi RAB');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const handleSaveRab = async () => {
        if (!periodeId || !tanggalInput) { toast.error('Lengkapi periode dan tanggal.'); return; }
        if (rabItems.length === 0) { toast.error('Tidak ada item bahan untuk disimpan.'); return; }

        setIsSaving(true);
        try {
            const body = {
                periodeId,
                tanggal: tanggalInput,
                items: rabItems.map(i => ({
                    bahanPokokId: i.bahanPokokId,
                    hargaSatuan: Number(i._hargaInput)
                }))
            };

            const r = await request('/akuntan/rab-harian', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (r.ok) {
                toast.success('RAB Harian berhasil disimpan.');
                setTanggalInput('');
                setRabPreview(null);
                setRabItems([]);
                loadRabHarian(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal menyimpan RAB' }));
                toast.error(d.error || 'Gagal menyimpan RAB Harian');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setIsSaving(false);
        }
    };

    // ─── ANGGARAN ───

    const loadAnggaran = async (pid) => {
        if (!pid) return;
        setAnggaranLoading(true);
        try {
            const r = await request(`/akuntan/anggaran-harian?periodeId=${pid}`);
            if (r.ok) {
                setAnggaranList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar Anggaran Harian' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setAnggaranLoading(false);
        }
    };

    const loadRingkasanAnggaran = async (pid) => {
        if (!pid) return;
        setRingkasanLoading(true);
        try {
            const r = await request(`/laporan/ringkasan-anggaran?periodeId=${pid}`);
            if (r.ok) {
                const json = await r.json();
                setRingkasanAnggaran(json.data || []);
                setTotalRingkasan(json.total || null);
            }
        } catch (err) {
            // silent — jangan toast error untuk ringkasan
        } finally {
            setRingkasanLoading(false);
        }
    };

    useEffect(() => {
        if (periodeId) {
            loadAnggaran(periodeId);
            loadRingkasanAnggaran(periodeId);
        }
    }, [periodeId]);

    const createAnggaranHarian = async (e) => {
        e.preventDefault();
        const { tanggal, kategoriDana, totalAnggaran, keterangan } = anggaranForm;
        if (!periodeId) { toast.error('Periode wajib dipilih.'); return; }
        if (!tanggal) { toast.error('Tanggal anggaran wajib diisi.'); return; }
        if (!kategoriDana) { toast.error('Kategori dana wajib diisi.'); return; }
        if (totalAnggaran === undefined || totalAnggaran === '') { toast.error('Total anggaran wajib diisi.'); return; }

        const body = { periodeId, tanggal, kategoriDana, totalAnggaran: parseFloat(totalAnggaran), keterangan: keterangan || undefined };

        try {
            const r = await request('/akuntan/anggaran-harian', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (r.ok) {
                toast.success('Anggaran Harian berhasil disimpan.');
                setAnggaranForm({ tanggal: '', kategoriDana: '', totalAnggaran: '', keterangan: '' });
                loadAnggaran(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                toast.error(d.error || 'Gagal menyimpan Anggaran Harian');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // ─── Edit & Hapus Anggaran ───
    const [anggaranEditTarget, setAnggaranEditTarget] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const saveEditAnggaran = async (e) => {
        e.preventDefault();
        if (!anggaranEditTarget) return;
        const { tanggal, kategoriDana, totalAnggaran, keterangan } = anggaranEditTarget;
        if (!tanggal || !kategoriDana) { toast.error('Tanggal dan kategori dana wajib diisi.'); return; }
        if (totalAnggaran === undefined || totalAnggaran === '') { toast.error('Total anggaran wajib diisi.'); return; }

        try {
            const r = await request(`/akuntan/anggaran-harian/${anggaranEditTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tanggal, kategoriDana,
                    totalAnggaran: parseFloat(totalAnggaran),
                    keterangan: keterangan || undefined
                })
            });
            if (r.ok) {
                toast.success('Anggaran Harian berhasil diperbarui.');
                setAnggaranEditTarget(null);
                loadAnggaran(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memperbarui Anggaran Harian' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const deleteAnggaranHarian = async (id) => {
        try {
            const r = await request(`/akuntan/anggaran-harian/${id}`, { method: 'DELETE' });
            if (r.ok) {
                toast.success('Anggaran Harian berhasil dihapus.');
                loadAnggaran(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal menghapus Anggaran Harian' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // ─── RENDER ───

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>RAB &amp; Anggaran Harian</h2>

            {/* Pilihan Periode (shared) */}
            <PeriodSelector
                periods={periods}
                periodeId={periodeId}
                setPeriodeId={setPeriodeId}
            />

            {/* ─── Kartu Ringkasan Anggaran ─── */}
            <RingkasanAnggaranCards
                ringkasanLoading={ringkasanLoading}
                ringkasanAnggaran={ringkasanAnggaran}
                totalRingkasan={totalRingkasan}
            />

            {/* Tab bar */}
            <TabBar
                tab={tab}
                setTab={setTab}
            />

            {/* ───── TAB RAB ───── */}
            {tab === 'rab' && (
                <>
                    {/* Info banner */}
                    <div style={{
                        padding: '12px 16px', backgroundColor: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: 'var(--radius-sm)', marginBottom: '16px',
                        fontSize: '13px', color: 'var(--text)', lineHeight: '1.6'
                    }}>
                        ℹ️ <strong>Verifikasi harga bahan dari menu yang sudah disetujui Ahli Gizi.</strong>{' '}
                        Pilih tanggal untuk melihat daftar bahan + harga. Harga bisa disesuaikan tanpa mengubah
                        master harga Mitra. Simpan RAB lalu ajukan ke Kepala SPPG.
                    </div>

                    {/* Step 1: Pilih Tanggal + Preview */}
                    <RabPreviewSection
                        tanggalInput={tanggalInput}
                        setTanggalInput={setTanggalInput}
                        activePeriod={activePeriod}
                        previewLoading={previewLoading}
                        rabPreview={rabPreview}
                        rabP12Harian={rabP12Harian}
                        rabItems={rabItems}
                        handlePriceChange={handlePriceChange}
                        handleSaveRab={handleSaveRab}
                        isSaving={isSaving}
                    />

                    {/* Referensi Konversi Satuan */}
                    <KonversiSatuanBox
                        tanggalInput={tanggalInput}
                        kebutuhanHitungan={kebutuhanHitungan}
                    />

                    {/* Tabel Daftar RAB Harian */}
                    <RabHarianList
                        loading={loading}
                        rabList={rabList}
                        verifyRab={verifyRab}
                        triggerAjukan={triggerAjukan}
                        confirmOpen={confirmOpen}
                        pendingRabId={pendingRabId}
                        handleAjukan={handleAjukan}
                        setConfirmOpen={setConfirmOpen}
                        setPendingRabId={setPendingRabId}
                    />

                    {/* Section RAB P12 — Referensi Pagu & Kebutuhan */}
                    <RabP12RekapSection
                        loadingP12={loadingP12}
                        rabP12Rekap={rabP12Rekap}
                        previewRabP12Pdf={previewRabP12Pdf}
                        pdfLoading={pdfLoading}
                        tanggalInput={tanggalInput}
                    />
                </>
            )}

            {/* ───── TAB ANGGARAN ───── */}
            {tab === 'anggaran' && (
                <>
                    {/* ─── Create Form / Edit Modal ─── */}
                    <AnggaranForm
                        anggaranEditTarget={anggaranEditTarget}
                        setAnggaranEditTarget={setAnggaranEditTarget}
                        anggaranForm={anggaranForm}
                        setAnggaranForm={setAnggaranForm}
                        activePeriod={activePeriod}
                        createAnggaranHarian={createAnggaranHarian}
                        saveEditAnggaran={saveEditAnggaran}
                    />

                    <AnggaranList
                        anggaranLoading={anggaranLoading}
                        anggaranList={anggaranList}
                        setAnggaranEditTarget={setAnggaranEditTarget}
                        deleteConfirmId={deleteConfirmId}
                        setDeleteConfirmId={setDeleteConfirmId}
                        deleteAnggaranHarian={deleteAnggaranHarian}
                    />
                </>
            )}

            {/* PDF Preview Modal */}
            <RabP12PdfModal
                isPdfModalOpen={isPdfModalOpen}
                pdfUrl={pdfUrl}
                setIsPdfModalOpen={setIsPdfModalOpen}
                setPdfUrl={setPdfUrl}
            />
        </div>
    );
};
