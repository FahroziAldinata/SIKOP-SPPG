import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate, renderStatus, renderCurrency } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Skeleton } from '../../components/Skeleton';
import { Card } from '../../components/Card';

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

    const tabStyle = (t) => ({
        padding: '10px 24px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
        backgroundColor: tab === t ? 'var(--btn-primary-bg)' : 'var(--bg-elevated)',
        color: tab === t ? 'var(--btn-primary-text)' : 'var(--text-muted)',
        borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
        transition: 'all 0.15s ease'
    });

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>RAB &amp; Anggaran Harian</h2>

            {/* Pilihan Periode (shared) */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '20px',
                width: '26%',
                minWidth: '320px'
            }}>
                <label style={{
                    textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.07em', color: 'var(--text-muted)',
                    display: 'block', marginBottom: '6px'
                }}>
                    Periode aktif (transaksi harus dalam rentang tanggal periode ini)
                </label>
                <Dropdown
                    style={{ width: '100%' }}
                    value={periodeId}
                    onChange={val => setPeriodeId(val)}
                    options={periods.map(p => ({ value: p.id, label: `${p.tanggalMulai} - ${p.tanggalSelesai}` }))}
                />
            </div>

            {/* ─── Kartu Ringkasan Anggaran ─── */}
            {ringkasanLoading && (
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} height="100px" style={{ flex: 1 }} />)}
                </div>
            )}
            {!ringkasanLoading && ringkasanAnggaran.length > 0 && (
                <>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                        {ringkasanAnggaran.map((item, idx) => (
                            <Card key={idx} style={{ flex: 1, padding: '15px' }} hover={false}>
                                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                                    letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                    {item.label}
                                </div>
                                <div style={{ fontSize: '13px', lineHeight: '1.8', color: 'var(--text)' }}>
                                    <div>RAB: <strong>Rp{Number(item.totalRAB).toLocaleString('id-ID')}</strong></div>
                                    <div>Aktual: <strong>Rp{Number(item.totalAktual).toLocaleString('id-ID')}</strong></div>
                                    <div>Selisih: <strong style={{
                                        color: Number(item.totalSelisih) >= 0 ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)'
                                    }}>Rp{Number(Math.abs(item.totalSelisih)).toLocaleString('id-ID')}</strong></div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {item.jumlahTransaksi} transaksi
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                    {totalRingkasan && (
                        <Card style={{ display: 'flex', gap: '20px', padding: '12px 15px', marginBottom: '15px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }} hover={false}>
                            <span>Total RAB: <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(totalRingkasan.totalRAB).toLocaleString('id-ID')}</span></span>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <span>Total Aktual: <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(totalRingkasan.totalAktual).toLocaleString('id-ID')}</span></span>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <span>Sisa: <span style={{
                                fontVariantNumeric: 'tabular-nums',
                                color: Number(totalRingkasan.surplusUtang) >= 0 ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)'
                            }}>Rp{Number(Math.abs(totalRingkasan.surplusUtang)).toLocaleString('id-ID')}</span></span>
                        </Card>
                    )}
                </>
            )}

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
                <button style={tabStyle('rab')} onClick={() => setTab('rab')}>
                    📋 RAB Harian
                </button>
                <button style={tabStyle('anggaran')} onClick={() => setTab('anggaran')}>
                    💰 Anggaran Harian
                </button>
            </div>

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
                    <div style={{
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                        padding: '24px', backgroundColor: 'var(--bg-elevated)',
                        boxShadow: 'var(--shadow)', marginBottom: '20px'
                    }}>
                        <div style={{
                            display: 'flex', gap: '15px', alignItems: 'flex-end',
                            maxWidth: '640px', flexWrap: 'wrap', marginBottom: '20px'
                        }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{
                                    textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                    letterSpacing: '0.07em', color: 'var(--text-muted)',
                                    display: 'block', marginBottom: '6px'
                                }}>
                                    Pilih Tanggal RAB
                                </label>
                                <DatePicker
                                    value={tanggalInput}
                                    onChange={setTanggalInput}
                                    defaultFocusMonth={activePeriod?.tanggalMulai}
                                    required
                                />
                            </div>
                        </div>

                        {/* Preview content */}
                        {previewLoading && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[1, 2, 3].map(i => <Skeleton key={i} height="40px" />)}
                            </div>
                        )}

                        {tanggalInput && !previewLoading && rabPreview && !rabPreview.tersedia && (
                            <div style={{
                                padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text)'
                            }}>
                                ⚠️ {rabPreview.pesan || 'Menu Harian untuk tanggal ini belum disetujui Kepala SPPG.'}
                            </div>
                        )}

                        {tanggalInput && !previewLoading && rabPreview && rabPreview.tersedia && (
                            <div>
                                {/* Menu & Pagu Info (merged dengan rabP12Harian) */}
                                <div style={{
                                    backgroundColor: 'var(--bg)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '16px', marginBottom: '20px',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text)' }}>
                                        <div>
                                            Menu:{' '}
                                            <strong>{rabPreview.menu?.join(', ') || '—'}</strong>
                                        </div>
                                        <div>
                                            Porsi:{' '}
                                            <strong>{rabPreview.porsi?.KECIL ?? 0} Kecil</strong> +{' '}
                                            <strong>{rabPreview.porsi?.BESAR ?? 0} Besar</strong>
                                        </div>
                                        <div>
                                            Pagu:{' '}
                                            <strong style={{ color: 'var(--color-primary)' }}>
                                                Rp {renderCurrency(rabPreview.pagu?.total, false)}
                                            </strong>
                                        </div>
                                        {rabP12Harian && (
                                            <>
                                                <div style={{ color: 'var(--border)' }}>|</div>
                                                <div>Pagu Kecil: <strong>Rp {renderCurrency(rabP12Harian.pagu?.KECIL, false)}</strong></div>
                                                <div>Pagu Besar: <strong>Rp {renderCurrency(rabP12Harian.pagu?.BESAR, false)}</strong></div>
                                                <div>Total Pagu: <strong style={{ color: 'var(--color-primary)' }}>Rp {renderCurrency(rabP12Harian.pagu?.total, false)}</strong></div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Tabel SISWA */}
                                {(() => {
                                    const siswaItems = rabItems.filter(i => i.qtySiswa > 0);
                                    if (siswaItems.length === 0) return null;
                                    const sumSiswa = siswaItems.reduce((s, i) => s + i.subtotal, 0);
                                    return (
                                        <div style={{ marginBottom: '20px' }}>
                                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                                                SISWA — Subtotal Rp {renderCurrency(sumSiswa, false)}
                                            </h4>
                                            <Table
                                                columns={[
                                                    { key: 'nama', header: 'Bahan' },
                                                    { key: 'qtySiswa', header: 'Qty', align: 'right', render: (v) => `${Number(v).toLocaleString('id-ID')} kg` },
                                                    {
                                                        key: 'hargaSatuan',
                                                        header: 'Harga (Rp)',
                                                        align: 'right',
                                                        render: (v, row) => (
                                                            <NumberInput
                                                                value={row._hargaInput}
                                                                onChange={val => handlePriceChange(row.bahanPokokId, val)}
                                                                style={{ width: '100px', textAlign: 'right', fontSize: '12px' }}
                                                                placeholder="0"
                                                            />
                                                        )
                                                    },
                                                    { key: 'subtotal', header: 'Jumlah', align: 'right', render: (v) => <strong>Rp {renderCurrency(v, false)}</strong> }
                                                ]}
                                                data={siswaItems}
                                            />
                                        </div>
                                    );
                                })()}

                                {/* Tabel B3 */}
                                {(() => {
                                    const b3Items = rabItems.filter(i => i.qtyB3 > 0);
                                    if (b3Items.length === 0) return null;
                                    const sumB3 = b3Items.reduce((s, i) => s + i.subtotal, 0);
                                    return (
                                        <div style={{ marginBottom: '20px' }}>
                                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                                                B3 — Subtotal Rp {renderCurrency(sumB3, false)}
                                            </h4>
                                            <Table
                                                columns={[
                                                    { key: 'nama', header: 'Bahan' },
                                                    { key: 'qtyB3', header: 'Qty', align: 'right', render: (v) => `${Number(v).toLocaleString('id-ID')} kg` },
                                                    {
                                                        key: 'hargaSatuan',
                                                        header: 'Harga (Rp)',
                                                        align: 'right',
                                                        render: (v, row) => (
                                                            <NumberInput
                                                                value={row._hargaInput}
                                                                onChange={val => handlePriceChange(row.bahanPokokId, val)}
                                                                style={{ width: '100px', textAlign: 'right', fontSize: '12px' }}
                                                                placeholder="0"
                                                            />
                                                        )
                                                    },
                                                    { key: 'subtotal', header: 'Jumlah', align: 'right', render: (v) => <strong>Rp {renderCurrency(v, false)}</strong> }
                                                ]}
                                                data={b3Items}
                                            />
                                        </div>
                                    );
                                })()}

                                {/* Tabel bahan campuran (SISWA+B3, qty sama kedua jalur) — skip karena sudah tercakup di atas */}

                                {/* Summary Bar */}
                                {(() => {
                                    const total = rabItems.reduce((s, i) => s + i.subtotal, 0);
                                    const pagu = rabPreview.pagu?.total || 0;
                                    const sisa = Math.round((pagu - total) * 100) / 100;
                                    const isOver = sisa < 0;
                                    return (
                                        <div style={{
                                            display: 'flex', gap: '24px', alignItems: 'center',
                                            padding: '12px 16px', backgroundColor: isOver ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                                            borderRadius: 'var(--radius-sm)', border: `1px solid ${isOver ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)'}`,
                                            fontSize: '14px', fontWeight: 600, color: 'var(--text)'
                                        }}>
                                            <span>Total: <strong>Rp {renderCurrency(total, false)}</strong></span>
                                            <span>Pagu: <strong>Rp {renderCurrency(pagu, false)}</strong></span>
                                            <span>Sisa:{' '}
                                                <strong style={{ color: isOver ? 'var(--color-danger, #ef4444)' : 'var(--color-success, #22c55e)' }}>
                                                    Rp {renderCurrency(sisa, false)}
                                                </strong>
                                            </span>
                                        </div>
                                    );
                                })()}

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                    <button onClick={handleSaveRab} disabled={isSaving} style={{
                                        padding: '10px 24px', backgroundColor: 'var(--btn-primary-bg)',
                                        color: 'var(--btn-primary-text)', border: 'none',
                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        fontWeight: 600, fontSize: '14px'
                                    }}>
                                        {isSaving ? 'Menyimpan...' : 'Simpan RAB'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Referensi Konversi Satuan */}
                    {tanggalInput && kebutuhanHitungan.length > 0 && (
                        <div style={{
                            border: '1px solid var(--color-primary-light)',
                            backgroundColor: 'rgba(181, 224, 234, 0.15)',
                            padding: '16px', borderRadius: 'var(--radius-sm)',
                            marginBottom: '20px', maxWidth: '640px'
                        }}>
                            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>
                                📌 Referensi Konversi Satuan (Hitungan &rarr; KG)
                            </h4>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {kebutuhanHitungan.map((item) => (
                                    <div key={item.bahanPokokId} style={{
                                        backgroundColor: 'var(--bg-elevated)',
                                        border: '1px solid var(--border)', padding: '8px 12px',
                                        borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text)'
                                    }}>
                                        <strong>{item.nama}</strong>: {item.permintaanAG.toLocaleString('id-ID')} {item.satuanHitungan} &rarr; <strong>{item.final}</strong> KG{' '}
                                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(konversi {item.konversiPerKg}/kg)</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabel Daftar RAB Harian */}
                    <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar RAB Harian</h3>
                    {loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="40px" />)}
                        </div>
                    )}
                    {!loading && <Table
                        scrollHeight="540px"
                        columns={[
                            { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                            { key: 'status', header: 'Status', render: (v) => renderStatus(v) },
                            {
                                key: 'totalKebutuhan', header: 'Total Kebutuhan', align: 'right',
                                render: (v) => v ? <span>Rp {renderCurrency(v, false)}</span> : '—'
                            },
                            {
                                key: 'totalPagu', header: 'Pagu', align: 'right',
                                render: (v) => v ? <span>Rp {renderCurrency(v, false)}</span> : '—'
                            },
                            {
                                key: 'selisih', header: 'Sisa', align: 'right',
                                render: (v) => {
                                    if (v === null || v === undefined) return '—';
                                    const isNeg = Number(v) < 0;
                                    return <span style={{ fontWeight: 700, color: isNeg ? 'var(--color-danger, #ef4444)' : 'var(--text)' }}>Rp {renderCurrency(v, false)}</span>;
                                }
                            },
                            { key: 'createdBy', header: 'Dibuat Oleh', render: (v) => v?.nama || v?.username || '—' },
                            {
                                key: 'items', header: 'Item', align: 'right',
                                render: (v) => `${(v || []).length} bahan`
                            },
                            {
                                key: 'aksi', header: 'Aksi',
                                render: (_, row) => {
                                    if (row.status === 'DRAFT' || row.status === 'DITOLAK') {
                                        const isVerified = Boolean(row.verifiedAt);
                                        return (
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                {!isVerified && row.items?.length > 0 && (
                                                    <button onClick={() => verifyRab(row.id)} style={{
                                                        padding: '5px 10px', backgroundColor: '#22c55e',
                                                        color: '#fff', border: 'none',
                                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                                        fontWeight: 600, fontSize: '11px'
                                                    }}>
                                                        Verifikasi
                                                    </button>
                                                )}
                                                {isVerified ? (
                                                    <button onClick={() => triggerAjukan(row.id)} style={{
                                                        padding: '5px 12px', backgroundColor: 'var(--btn-primary-bg)',
                                                        color: 'var(--btn-primary-text)', border: 'none',
                                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                                        fontWeight: 600, fontSize: '12px'
                                                    }}>
                                                        Ajukan
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                        Verifikasi dulu sebelum mengajukan
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    }
                                    return '—';
                                }
                            }
                        ]}
                        data={rabList}
                        emptyText="Belum ada data RAB Harian untuk periode ini."
                    />}
                    <ConfirmDialog
                        open={confirmOpen}
                        title="Konfirmasi Pengajuan"
                        message="Ajukan RAB Harian ini ke Kepala SPPG untuk persetujuan?"
                        onConfirm={handleAjukan}
                        onCancel={() => { setConfirmOpen(false); setPendingRabId(null); }}
                    />

                    {/* Section RAB P12 — Referensi Pagu & Kebutuhan (dipindah ke bawah) */}
                    <div style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '24px',
                        backgroundColor: 'var(--bg-elevated)',
                        boxShadow: 'var(--shadow)',
                        marginTop: '20px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text)' }}>
                                📊 Rekap Pagu &amp; Pemakaian Periode
                            </h3>
                            <button
                                onClick={() => previewRabP12Pdf()}
                                disabled={pdfLoading || !tanggalInput}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    opacity: (pdfLoading || !tanggalInput) ? 0.6 : 1
                                }}
                            >
                                {pdfLoading ? 'Memuat PDF...' : '📄 Preview PDF'}
                            </button>
                        </div>

                        {/* Tabel rekap periode */}
                        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>
                            Rekap Pagu &amp; Pemakaian Periode
                        </h4>
                        {loadingP12 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[1, 2, 3, 4].map(i => <Skeleton key={i} height="40px" />)}
                            </div>
                        )}
                        {!loadingP12 && (
                            <Table
                                scrollHeight="540px"
                                columns={[
                                    { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                                    {
                                        key: 'porsi',
                                        header: 'Porsi',
                                        render: (v) => `K:${v?.KECIL ?? 0} B:${v?.BESAR ?? 0}`
                                    },
                                    {
                                        key: 'maksimalAnggaran',
                                        header: 'Maksimal Anggaran',
                                        align: 'right',
                                        render: (v) => <span>Rp {renderCurrency(v, false)}</span>
                                    },
                                    {
                                        key: 'jumlahKebutuhanBahan',
                                        header: 'Kebutuhan Bahan',
                                        align: 'right',
                                        render: (v) => <span>Rp {renderCurrency(v, false)}</span>
                                    },
                                    {
                                        key: 'pemakaianAnggaran',
                                        header: 'Pemakaian',
                                        align: 'right',
                                        render: (v) => <span>Rp {renderCurrency(v, false)}</span>
                                    },
                                    {
                                        key: 'sisa',
                                        header: 'Sisa',
                                        align: 'right',
                                        render: (v) => {
                                            const isNeg = Number(v) < 0;
                                            return (
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: isNeg ? 'var(--color-danger, #ef4444)' : 'var(--text)'
                                                }}>
                                                    Rp {renderCurrency(v, false)}
                                                </span>
                                            );
                                        }
                                    },
                                    {
                                        key: 'aksi',
                                        header: 'Aksi',
                                        align: 'center',
                                        render: (_, row) => (
                                            <button
                                                onClick={() => previewRabP12Pdf(row.tanggal)}
                                                disabled={pdfLoading}
                                                style={{
                                                    padding: '4px 10px',
                                                    backgroundColor: 'var(--btn-primary-bg)',
                                                    color: 'var(--btn-primary-text)',
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-sm)',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                📄 Preview PDF
                                            </button>
                                        )
                                    }
                                ]}
                                data={rabP12Rekap}
                                emptyText="Belum ada data rekap untuk periode ini."
                            />
                        )}
                    </div>
                </>
            )}

            {/* ───── TAB ANGGARAN ───── */}
            {tab === 'anggaran' && (
                <>
                    {/* ─── Create Form / Edit Modal ─── */}
                    {anggaranEditTarget ? (
                        <form onSubmit={saveEditAnggaran} style={{
                            border: '1px solid var(--color-warning, #f59e0b)', borderRadius: 'var(--radius-md)',
                            padding: '24px', backgroundColor: 'var(--bg-elevated)',
                            boxShadow: 'var(--shadow)', marginBottom: '20px',
                            display: 'flex', flexDirection: 'column', gap: '16px'
                        }}>
                            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>
                                Edit Anggaran Harian
                            </h3>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 200px' }}>
                                    <label style={{
                                        textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                        letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                    }}>Tanggal</label>
                                    <DatePicker
                                        value={anggaranEditTarget.tanggal}
                                        onChange={val => setAnggaranEditTarget(prev => ({ ...prev, tanggal: val }))}
                                        defaultFocusMonth={activePeriod?.tanggalMulai}
                                        required
                                    />
                                </div>
                                <div style={{ flex: '1 1 200px' }}>
                                    <label style={{
                                        textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                        letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                    }}>Kategori Dana</label>
                                    <Dropdown
                                        style={{ width: '100%' }}
                                        value={anggaranEditTarget.kategoriDana}
                                        onChange={val => setAnggaranEditTarget(prev => ({ ...prev, kategoriDana: val }))}
                                        options={[
                                            { value: '', label: '-- Pilih Kategori Dana --' },
                                            { value: 'OPERASIONAL', label: 'OPERASIONAL' },
                                            { value: 'INSENTIF_FASILITAS', label: 'INSENTIF_FASILITAS (SEWA)' }
                                        ]}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 200px' }}>
                                    <label style={{
                                        textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                        letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                    }}>Total Anggaran (Rp)</label>
                                    <NumberInput
                                        placeholder="Total Anggaran"
                                        value={anggaranEditTarget.totalAnggaran}
                                        onChange={val => setAnggaranEditTarget(prev => ({ ...prev, totalAnggaran: val }))}
                                        className="form-field"
                                        required
                                    />
                                </div>
                                <div style={{ flex: '1 1 200px' }}>
                                    <label style={{
                                        textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                        letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                    }}>Keterangan</label>
                                    <input
                                        type="text"
                                        placeholder="Keterangan"
                                        value={anggaranEditTarget.keterangan || ''}
                                        onChange={e => setAnggaranEditTarget(prev => ({ ...prev, keterangan: e.target.value }))}
                                        className="form-field"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" style={{
                                    padding: '10px 20px', backgroundColor: 'var(--color-warning, #f59e0b)',
                                    color: '#fff', border: 'none',
                                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                                }}>
                                    Simpan Perubahan
                                </button>
                                <button type="button" onClick={() => setAnggaranEditTarget(null)} style={{
                                    padding: '10px 20px', backgroundColor: 'transparent',
                                    color: 'var(--text-muted)', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                                }}>
                                    Batal
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={createAnggaranHarian} style={{
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                            padding: '24px', backgroundColor: 'var(--bg-elevated)',
                            boxShadow: 'var(--shadow)', marginBottom: '20px',
                            display: 'flex', flexDirection: 'column', gap: '16px'
                        }}>
                            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Buat Anggaran Harian</h3>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 200px' }}>
                                    <label style={{
                                        textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                        letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                    }}>Tanggal</label>
                                    <DatePicker
                                        value={anggaranForm.tanggal}
                                        onChange={val => setAnggaranForm(prev => ({ ...prev, tanggal: val }))}
                                        defaultFocusMonth={activePeriod?.tanggalMulai}
                                        required
                                    />
                                </div>
                                <div style={{ flex: '1 1 200px' }}>
                                    <label style={{
                                        textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                        letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                    }}>Kategori Dana</label>
                                    <Dropdown
                                        style={{ width: '100%' }}
                                        value={anggaranForm.kategoriDana}
                                        onChange={val => setAnggaranForm(prev => ({ ...prev, kategoriDana: val }))}
                                        options={[
                                            { value: '', label: '-- Pilih Kategori Dana --' },
                                            { value: 'OPERASIONAL', label: 'OPERASIONAL' },
                                            { value: 'INSENTIF_FASILITAS', label: 'INSENTIF_FASILITAS (SEWA)' }
                                        ]}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 200px' }}>
                                    <label style={{
                                        textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                        letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                    }}>Total Anggaran (Rp)</label>
                                    <NumberInput
                                        placeholder="Total Anggaran"
                                        value={anggaranForm.totalAnggaran}
                                        onChange={val => setAnggaranForm(prev => ({ ...prev, totalAnggaran: val }))}
                                        className="form-field"
                                        required
                                    />
                                </div>
                                <div style={{ flex: '1 1 200px' }}>
                                    <label style={{
                                        textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                        letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                    }}>Keterangan (opsional)</label>
                                    <input
                                        type="text"
                                        placeholder="Keterangan"
                                        value={anggaranForm.keterangan}
                                        onChange={e => setAnggaranForm(prev => ({ ...prev, keterangan: e.target.value }))}
                                        className="form-field"
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <button type="submit" style={{
                                    padding: '10px 20px', backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)', border: 'none',
                                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                                }}>
                                    Simpan Anggaran
                                </button>
                            </div>
                        </form>
                    )}

                    <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Anggaran Harian</h3>
                    {anggaranLoading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="40px" />)}
                        </div>
                    )}
                    {!anggaranLoading && <>
                        <Table
                            columns={[
                                { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                                { key: 'kategoriDana', header: 'Kategori Dana' },
                                {
                                    key: 'keterangan', header: 'Keterangan',
                                    render: (v) => v || <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                                },
                                { key: 'rab', header: 'Anggaran (RAB)', align: 'right', render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>Rp{Number(v).toLocaleString('id-ID')}</span> },
                                { key: 'aktual', header: 'Realisasi (Aktual)', align: 'right', render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>Rp{Number(v).toLocaleString('id-ID')}</span> },
                                { key: 'selisih', header: 'Selisih', align: 'right', render: (v) => <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>Rp{Number(v).toLocaleString('id-ID')}</strong> },
                                {
                                    key: 'aksi', header: 'Aksi', align: 'center',
                                    render: (_v, row) => (
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => setAnggaranEditTarget({
                                                    id: row.id,
                                                    tanggal: row.tanggal,
                                                    kategoriDana: row.kategoriDana,
                                                    totalAnggaran: row.rab,
                                                    keterangan: row.keterangan || ''
                                                })}
                                                style={{
                                                    padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                                                    border: '1px solid var(--color-warning, #f59e0b)',
                                                    borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent',
                                                    color: 'var(--color-warning, #f59e0b)', cursor: 'pointer'
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirmId(row.id)}
                                                style={{
                                                    padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                                                    border: '1px solid var(--color-danger, #ef4444)',
                                                    borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent',
                                                    color: 'var(--color-danger, #ef4444)', cursor: 'pointer'
                                                }}
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    )
                                }
                            ]}
                            data={anggaranList}
                            emptyText="Belum ada data Anggaran Harian untuk periode ini."
                        />
                        <ConfirmDialog
                            isOpen={deleteConfirmId !== null}
                            title="Hapus Anggaran Harian?"
                            message="Data yang dihapus tidak dapat dikembalikan."
                            confirmLabel="Hapus"
                            confirmStyle="danger"
                            onConfirm={() => {
                                if (deleteConfirmId) {
                                    deleteAnggaranHarian(deleteConfirmId);
                                    setDeleteConfirmId(null);
                                }
                            }}
                            onCancel={() => setDeleteConfirmId(null)}
                        />
                    </>}
                </>
            )}
            {/* PDF Preview Modal */}
            {isPdfModalOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-elevated, #fff)', borderRadius: 'var(--radius-md, 8px)',
                        width: '90%', height: '90%', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', padding: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text)' }}>Preview PDF RAB P12</h3>
                            <button
                                onClick={() => {
                                    setIsPdfModalOpen(false);
                                    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
                                    setPdfUrl(null);
                                }}
                                style={{
                                    padding: '6px 16px', backgroundColor: 'var(--color-danger, #ef4444)',
                                    color: '#fff', border: 'none', borderRadius: 'var(--radius-sm, 4px)',
                                    cursor: 'pointer', fontWeight: 600
                                }}
                            >
                                Tutup
                            </button>
                        </div>
                        <div style={{ flex: 1, width: '100%', height: '100%' }}>
                            <iframe src={pdfUrl} title="PDF RAB P12" style={{ width: '100%', height: '100%', border: 'none' }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
