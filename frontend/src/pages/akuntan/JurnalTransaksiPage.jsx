import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate, renderCode, renderTruncate, renderStatus } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from "../../components/Dropdown";
import { NumberInput } from '../../components/NumberInput';
import { Skeleton } from '../../components/Skeleton';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export const JurnalTransaksiPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
    const [akunList, setAkunList] = useState([]);
    const [jurnalList, setJurnalList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [realizedPoList, setRealizedPoList] = useState([]);
    const [selectedPrefillPoId, setSelectedPrefillPoId] = useState('');

    // Bulk generate state
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkData, setBulkData] = useState([]);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkConfirm, setBulkConfirm] = useState({ open: false, count: 0 });

    // Pagination state
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

    // Single Edit state
    const [editId, setEditId] = useState(null);

    const [jurnalForm, setJurnalForm] = useState({
        tanggal: '',
        uraian: '',
        jenis: '',
        nominal: '',
        akunDanaBiayaId: '',
        akunKasId: '',
        transaksiPembelianId: ''
    });

    // Load periods & accounts on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));

        request('/akuntan/akun')
            .then(r => r.json())
            .then(d => setAkunList(d))
            .catch(() => toast.error('Gagal memuat daftar akun.'));
    }, []);

    const loadJurnal = async (pid, targetPage = 1) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/akuntan/jurnal-transaksi?periodeId=${pid}&page=${targetPage}&limit=50`);
            if (r.ok) {
                const resJson = await r.json();
                if (Array.isArray(resJson)) {
                    setJurnalList(resJson);
                    setPagination({ page: 1, limit: 50, total: resJson.length, totalPages: 1 });
                } else {
                    setJurnalList(resJson.data || []);
                    setPagination(resJson.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
                }
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar Jurnal Transaksi' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    const loadRealizedPos = async (pid) => {
        if (!pid) return;
        try {
            // bulk-preview = PO DIREALISASI yang BELUM di-jurnal (anti-dobel otomatis)
            const r = await request(`/akuntan/jurnal-transaksi/bulk-preview?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setRealizedPoList(resJson.data || []);
            } else {
                setRealizedPoList([]);
            }
        } catch (err) {
            console.error('Gagal memuat daftar PO realisasi:', err);
            setRealizedPoList([]);
        }
    };

    // Load journal list when period changes
    useEffect(() => {
        if (periodeId) {
            setPage(1);
            loadJurnal(periodeId, 1);
            loadRealizedPos(periodeId);
            handleCancelEdit();
        }
    }, [periodeId]);

    const activePeriod = periods.find(p => p.id === periodeId);

    // Save Jurnal (Create or Update)
    const saveJurnal = async (e) => {
        e.preventDefault();
        const {
            tanggal,
            uraian,
            jenis,
            nominal,
            akunDanaBiayaId,
            akunKasId,
            transaksiPembelianId
        } = jurnalForm;

        if (!periodeId) {
            toast.error('Periode wajib dipilih.');
            return;
        }
        if (!tanggal) {
            toast.error('Tanggal transaksi wajib diisi.');
            return;
        }
        if (!uraian) {
            toast.error('Uraian transaksi wajib diisi.');
            return;
        }
        if (!jenis) {
            toast.error('Jenis transaksi wajib dipilih (MASUK/KELUAR).');
            return;
        }
        if (nominal === undefined || nominal === '') {
            toast.error('Nominal wajib diisi.');
            return;
        }
        const valNominal = parseFloat(nominal);
        if (isNaN(valNominal) || valNominal <= 0) {
            toast.error('Nominal harus berupa angka positif.');
            return;
        }
        if (!akunDanaBiayaId) {
            toast.error('Akun Dana/Biaya wajib dipilih.');
            return;
        }
        if (!akunKasId) {
            toast.error('Akun Kas wajib dipilih.');
            return;
        }

        try {
            let r;
            if (editId) {
                // Update mode (PUT)
                r = await request(`/akuntan/jurnal-transaksi/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tanggal,
                        uraian,
                        jenis,
                        nominal: valNominal,
                        akunDanaBiayaId,
                        akunKasId,
                        transaksiPembelianId: transaksiPembelianId || undefined
                    })
                });
            } else {
                // Create mode (POST)
                r = await request('/akuntan/jurnal-transaksi', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        periodeId,
                        tanggal,
                        uraian,
                        jenis,
                        nominal: valNominal,
                        akunDanaBiayaId,
                        akunKasId,
                        transaksiPembelianId: transaksiPembelianId || undefined
                    })
                });
            }

            if (r.ok) {
                toast.success(editId ? 'Jurnal Transaksi berhasil diperbarui.' : 'Jurnal Transaksi berhasil disimpan.');
                handleCancelEdit();
                loadJurnal(periodeId, page);
                if (!editId) loadRealizedPos(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi.');
        }
    };

    // Start editing a row
    const handleStartEdit = (row) => {
        setEditId(row.id);
        const rawTgl = row.tanggal ? (row.tanggal.includes('T') ? row.tanggal.split('T')[0] : row.tanggal) : '';
        setJurnalForm({
            tanggal: rawTgl,
            uraian: row.uraian || '',
            jenis: row.jenis || '',
            nominal: row.nominal ? String(row.nominal) : '',
            akunDanaBiayaId: row.akunDanaBiayaId || '',
            akunKasId: row.akunKasId || '',
            transaksiPembelianId: row.transaksiPembelianId || ''
        });
    };

    // Cancel edit mode
    const handleCancelEdit = () => {
        setEditId(null);
        setJurnalForm({
            tanggal: '',
            uraian: '',
            jenis: '',
            nominal: '',
            akunDanaBiayaId: '',
            akunKasId: '',
            transaksiPembelianId: ''
        });
        setSelectedPrefillPoId('');
    };

    const handleDelete = async (id) => {
        setConfirmModal({
            open: true,
            title: 'Konfirmasi Hapus',
            message: 'Apakah Anda yakin ingin menghapus jurnal transaksi ini? Tindakan ini tidak dapat dibatalkan.',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, open: false }));
                try {
                    const r = await request(`/akuntan/jurnal-transaksi/${id}`, {
                        method: 'DELETE'
                    });
                    if (r.ok) {
                        toast.success('Jurnal Transaksi berhasil dihapus.');
                        loadJurnal(periodeId, page);
                        loadRealizedPos(periodeId);
                    } else {
                        const d = await r.json().catch(() => ({ error: 'Gagal menghapus jurnal transaksi' }));
                        toast.error(d.error);
                    }
                } catch (err) {
                    toast.error(err.message || 'Terjadi kesalahan koneksi');
                }
            }
        });
    };

    const handlePrefillFromPo = async () => {
        if (!selectedPrefillPoId) return;
        try {
            const r = await request(`/akuntan/jurnal-transaksi/prefill/${selectedPrefillPoId}`);
            if (r.ok) {
                const data = await r.json();
                setJurnalForm(prev => ({
                    ...prev,
                    tanggal: data.tanggal,
                    uraian: data.uraian,
                    nominal: data.nominal ? String(data.nominal) : prev.nominal,
                    jenis: 'KELUAR',
                    akunDanaBiayaId: data.akunDanaBiayaId || prev.akunDanaBiayaId,
                    akunKasId: data.akunKasId || prev.akunKasId,
                    transaksiPembelianId: data.transaksiPembelianId
                }));
                toast.success('Form berhasil diisi dari data PO (Akun otomatis ke-prefill).');
            } else {
                const errData = await r.json().catch(() => ({ error: 'Gagal prefill data dari PO.' }));
                toast.error(errData.error);
            }
        } catch (err) {
            toast.error('Terjadi kesalahan koneksi.');
        }
    };

    // ---- Bulk generate jurnal (desain Rozi) ----
    const openBulkModal = async () => {
        if (!periodeId) {
            toast.error('Periode wajib dipilih terlebih dahulu.');
            return;
        }
        setBulkModalOpen(true);
        setBulkLoading(true);
        setBulkData([]);
        try {
            const r = await request(`/akuntan/jurnal-transaksi/bulk-preview?periodeId=${periodeId}`);
            if (r.ok) {
                const resJson = await r.json();
                setBulkData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat data bulk jurnal.' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi.');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkHargaChange = (poIndex, itemIndex, value) => {
        setBulkData(prev => {
            const next = prev.map((po, i) => {
                if (i !== poIndex) return po;
                const items = po.items.map((it, j) => {
                    if (j !== itemIndex) return it;
                    const harga = Number(value) || 0;
                    const subtotal = Math.round(Number(it.qtyRealisasi) * harga * 100) / 100;
                    return { ...it, hargaSatuanRealisasi: harga, subtotalRealisasi: subtotal };
                });
                const total = Math.round(items.reduce((s, it) => s + Number(it.subtotalRealisasi || 0), 0) * 100) / 100;
                return { ...po, items, total };
            });
            return next;
        });
    };

    const handleBulkGenerate = () => {
        if (!bulkData.length) {
            toast.error('Tidak ada PO yang bisa di-jurnal.');
            return;
        }
        setBulkConfirm({ open: true, count: bulkData.length });
    };

    const confirmBulkGenerate = async () => {
        setBulkConfirm(prev => ({ ...prev, open: false }));
        setBulkSaving(true);
        try {
            const rows = bulkData.map(po => ({
                transaksiPembelianId: po.id,
                items: po.items.map(it => ({
                    id: it.id,
                    hargaSatuanRealisasi: Number(it.hargaSatuanRealisasi) || 0
                }))
            }));

            const r = await request('/akuntan/jurnal-transaksi/bulk-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periodeId, rows })
            });

            if (r.ok) {
                const resJson = await r.json();
                const count = resJson.count || rows.length;
                toast.success(`✅ Jurnal berhasil dibuat (${count})`);
                setBulkModalOpen(false);
                setBulkData([]);
                handleCancelEdit();
                loadJurnal(periodeId, page);
                loadRealizedPos(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan saat generate bulk jurnal.' }));
                toast.error(d.error);
                openBulkModal();
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi.');
        } finally {
            setBulkSaving(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ color: 'var(--text)', margin: 0 }}>Pencatatan Jurnal Transaksi Ledger</h2>
            </div>
            
            {/* Filter Periode */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                width: '26%',
                minWidth: '320px'
            }}>
                <label style={{
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '6px'
                }}>
                    Periode aktif (transaksi harus dalam rentang tanggal periode ini)
                </label>
                <Dropdown
                    style={{ width: '100%' }}
                    value={periodeId}
                    onChange={setPeriodeId}
                    options={periods.map(p => ({
                        value: p.id,
                        label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
                    }))}
                />
            </div>

            {/* Form Jurnal (Create / Edit) */}
            <form onSubmit={saveJurnal} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--text)' }}>
                        {editId ? 'Edit Jurnal Transaksi' : 'Buat Jurnal Transaksi'}
                    </h3>
                    {editId && (
                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(234,179,8,0.15)', color: '#ca8a04', fontWeight: 600 }}>
                            Mode Edit Active
                        </span>
                    )}
                </div>

                {/* Quick-fill: Bantuan Pemerintah (Only in Create mode or when editing) */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginRight: '4px' }}>
                        Isi Cepat BanPer:
                    </span>
                    {[
                        { label: 'Bahan Baku', uraian: 'Diterima Dana BanPer untuk Bahan Baku', kategori: 'BAHAN_MAKANAN' },
                        { label: 'Operasional', uraian: 'Diterima Dana BanPer untuk Operasional', kategori: 'OPERASIONAL' },
                        { label: 'Insentif Fasilitas', uraian: 'Diterima Dana BanPer untuk Insentif Fasilitas', kategori: 'INSENTIF_FASILITAS' },
                    ].map(({ label, uraian, kategori }) => {
                        const akunDana = akunList.find(a => a.tipe === 'DANA' && a.kategoriDana === kategori) || akunList.find(a => a.tipe === 'BIAYA' && a.kategoriDana === kategori);
                        return (
                            <button
                                key={kategori}
                                type="button"
                                disabled={!akunDana}
                                title={akunDana ? `Auto-isi: ${uraian} → Akun [${akunDana?.kode}]` : 'Akun Dana untuk kategori ini tidak ditemukan'}
                                onClick={() => setJurnalForm(prev => ({
                                    ...prev,
                                    uraian,
                                    jenis: 'MASUK',
                                    akunDanaBiayaId: akunDana?.id || prev.akunDanaBiayaId
                                }))}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid var(--color-primary, #4f46e5)',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--color-primary, #4f46e5)',
                                    cursor: akunDana ? 'pointer' : 'not-allowed',
                                    opacity: akunDana ? 1 : 0.45,
                                }}
                            >
                                + {label}
                            </button>
                        );
                    })}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>(masih bisa edit manual)</span>
                </div>

                {/* Quick-fill: Dari Purchase Order */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '-4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginRight: '4px' }}>
                                        Isi dari PO:
                                    </span>
                                    <Dropdown
                                        style={{ minWidth: '220px' }}
                                        value={selectedPrefillPoId}
                                        onChange={setSelectedPrefillPoId}
                                        options={[
                                            { value: '', label: '-- Pilih PO Direalisasi --' },
                                            ...realizedPoList.map(po => ({
                                                value: po.id,
                                                label: `${(po.tanggal || '').split('T')[0]} - ${po.supplier?.nama} (Rp${Number(po.total || 0).toLocaleString('id-ID')})`
                                            }))
                                        ]}
                                    />
                                    <button
                                        type="button"
                                        disabled={!selectedPrefillPoId}
                                        onClick={handlePrefillFromPo}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            border: '1px solid var(--color-primary, #4f46e5)',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: selectedPrefillPoId ? 'var(--color-primary, #4f46e5)' : 'transparent',
                                            color: selectedPrefillPoId ? '#ffffff' : 'var(--color-primary, #4f46e5)',
                                            cursor: selectedPrefillPoId ? 'pointer' : 'not-allowed',
                                            opacity: selectedPrefillPoId ? 1 : 0.45,
                                        }}
                                    >
                                        Isi dari PO
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openBulkModal}
                                        disabled={!periodeId}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            border: '1px solid var(--color-primary, #4f46e5)',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: periodeId ? 'var(--color-primary, #4f46e5)' : 'var(--text-muted)',
                                            color: periodeId ? '#ffffff' : 'var(--text-muted)',
                                            cursor: periodeId ? 'pointer' : 'not-allowed',
                                            opacity: periodeId ? 1 : 0.45,
                                        }}
                                    >
                                        Generate Jurnal (Bulk)
                                    </button>
                                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
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
                            value={jurnalForm.tanggal}
                            onChange={val => setJurnalForm(prev => ({ ...prev, tanggal: val }))}
                            defaultFocusMonth={activePeriod?.tanggalMulai}
                            required
                        />
                    </div>
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
                            Uraian
                        </label>
                        <input
                            type="text"
                            className="form-field"
                            placeholder="Contoh: Pembelian Beras 50kg"
                            value={jurnalForm.uraian}
                            onChange={e => setJurnalForm(prev => ({ ...prev, uraian: e.target.value }))}
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
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
                            Jenis Transaksi
                        </label>
                        <Dropdown
                            style={{ width: '100%' }}
                            value={jurnalForm.jenis}
                            onChange={val => setJurnalForm(prev => ({ ...prev, jenis: val }))}
                            options={[
                                { value: '', label: '-- Pilih Jenis --' },
                                { value: 'MASUK', label: 'MASUK (Penerimaan Kas)' },
                                { value: 'KELUAR', label: 'KELUAR (Pengeluaran Kas)' },
                            ]}
                        />
                    </div>
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
                            Nominal
                        </label>
                        <NumberInput
                            className="form-field"
                            placeholder="Nominal (Rp)"
                            value={jurnalForm.nominal}
                            onChange={val => setJurnalForm(prev => ({ ...prev, nominal: val }))}
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
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
                            Akun Kas
                        </label>
                        <Dropdown
                            style={{ width: '100%' }}
                            value={jurnalForm.akunKasId}
                            onChange={val => setJurnalForm(prev => ({ ...prev, akunKasId: val }))}
                            options={[
                                { value: '', label: '-- Pilih Akun Kas --' },
                                ...akunList.filter(a => a.tipe === 'KAS').map(a => ({
                                    value: a.id,
                                    label: `[${a.kode}] ${a.nama} (${a.tipe})`
                                }))
                            ]}
                        />
                    </div>
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
                            Akun Dana / Biaya
                        </label>
                        <Dropdown
                            style={{ width: '100%' }}
                            value={jurnalForm.akunDanaBiayaId}
                            onChange={val => setJurnalForm(prev => ({ ...prev, akunDanaBiayaId: val }))}
                            options={[
                                { value: '', label: '-- Pilih Akun Dana / Biaya --' },
                                ...akunList.filter(a => a.tipe !== 'KAS').map(a => ({
                                    value: a.id,
                                    label: `[${a.kode}] ${a.nama} (${a.tipe})`
                                }))
                            ]}
                        />
                    </div>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{
                        padding: '10px 20px',
                        backgroundColor: editId ? '#eab308' : 'var(--btn-primary-bg)',
                        color: editId ? '#000' : 'var(--btn-primary-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}>
                        {editId ? 'Update Jurnal' : 'Simpan Jurnal'}
                    </button>
                    {editId && (
                        <button type="button" onClick={handleCancelEdit} style={{
                            padding: '10px 20px',
                            backgroundColor: 'transparent',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}>
                            Batal
                        </button>
                    )}
                </div>
            </form>

            {/* List Jurnal */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Jurnal Transaksi</h3>
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}
            {!loading && (
                <>
                    <Table
                        columns={[
                            { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                            { key: 'nomorBukti', header: 'Nomor Bukti', render: (v) => renderCode(v) },
                            { key: 'uraian', header: 'Uraian', render: (v) => renderTruncate(v) },
                            { key: 'jenis', header: 'Jenis', render: (v) => renderStatus(v) },
                            {
                                key: 'nominal',
                                header: 'Nominal',
                                align: 'right',
                                render: (v) => (
                                    <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                        Rp{Number(v).toLocaleString('id-ID')}
                                    </strong>
                                )
                            },
                            { key: 'akunKas', header: 'Akun Kas', render: (v) => v ? `[${v.kode}] ${v.nama}` : '—' },
                            { key: 'akunDanaBiaya', header: 'Akun Dana / Biaya', render: (v) => v ? `[${v.kode}] ${v.nama}` : '—' },
                            {
                                key: 'id',
                                header: 'Aksi',
                                align: 'center',
                                width: '140px',
                                render: (_, row) => (
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleStartEdit(row)}
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--border)',
                                                backgroundColor: 'var(--bg)',
                                                color: 'var(--text)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(row.id)}
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                color: 'var(--color-danger)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                )
                            }
                        ]}
                        data={jurnalList}
                        emptyText="Belum ada data Jurnal Transaksi untuk periode ini."
                    />

                    {/* Pagination Controls */}
                    {pagination.totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '15px',
                            padding: '12px 16px',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                Halaman <strong>{pagination.page}</strong> dari <strong>{pagination.totalPages}</strong> (Total <strong>{pagination.total}</strong> transaksi)
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    disabled={pagination.page <= 1}
                                    onClick={() => {
                                        const newPage = pagination.page - 1;
                                        setPage(newPage);
                                        loadJurnal(periodeId, newPage);
                                    }}
                                    style={{
                                        padding: '6px 14px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg)',
                                        color: 'var(--text)',
                                        cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                                        opacity: pagination.page <= 1 ? 0.5 : 1
                                    }}
                                >
                                    &laquo; Sebelum
                                </button>
                                <button
                                    type="button"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => {
                                        const newPage = pagination.page + 1;
                                        setPage(newPage);
                                        loadJurnal(periodeId, newPage);
                                    }}
                                    style={{
                                        padding: '6px 14px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg)',
                                        color: 'var(--text)',
                                        cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                                        opacity: pagination.page >= pagination.totalPages ? 0.5 : 1
                                    }}
                                >
                                    Berikut &raquo;
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal Bulk Generate Jurnal */}
            {bulkModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
                        width: '95%',
                        maxWidth: '1100px',
                        maxHeight: '88vh',
                        boxShadow: 'var(--shadow-hover)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                                Generate Jurnal (Bulk) — PO Direalisasi Belum Di-Jurnal
                            </h3>
                            <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', backgroundColor: 'rgba(79,70,229,0.12)', color: 'var(--color-primary, #4f46e5)', fontWeight: 700 }}>
                                {bulkData.length} PO
                            </span>
                        </div>

                        {bulkLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <Skeleton height="40px" />
                                <Skeleton height="40px" />
                                <Skeleton height="40px" />
                            </div>
                        ) : bulkData.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                                Tidak ada PO Direalisasi yang belum di-jurnal untuk periode ini.
                            </p>
                        ) : (
                            <div style={{
                                overflow: 'auto',
                                maxHeight: '58vh',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg)', position: 'sticky', top: 0 }}>
                                            {['No', 'No PO', 'Supplier', 'Tanggal', 'Bahan', 'Qty', 'Harga (Rp)', 'Subtotal (Rp)'].map(h => (
                                                <th key={h} style={{
                                                    padding: '8px 10px',
                                                    textAlign: h === 'Harga (Rp)' || h === 'Subtotal (Rp)' || h === 'Qty' ? 'right' : 'left',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    color: 'var(--text-muted)',
                                                    borderBottom: '1px solid var(--border)',
                                                    whiteSpace: 'nowrap'
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bulkData.map((po, pi) => {
                                            return po.items.map((it, ii) => {
                                                const firstRow = ii === 0;
                                                return (
                                                    <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{firstRow ? pi + 1 : ''}</td>
                                                        <td style={{ padding: '6px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>{firstRow ? po.nomorPo : ''}</td>
                                                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{firstRow ? po.supplier?.nama : ''}</td>
                                                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{firstRow ? (po.tanggal || '').split('T')[0] : ''}</td>
                                                        <td style={{ padding: '6px 10px' }}>{it.namaBahan}</td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                            {Number(it.qtyRealisasi).toLocaleString('id-ID')} {it.satuan}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', width: '140px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="any"
                                                                value={it.hargaSatuanRealisasi ?? ''}
                                                                onChange={e => handleBulkHargaChange(pi, ii, e.target.value)}
                                                                style={{
                                                                    width: '110px',
                                                                    padding: '5px 8px',
                                                                    textAlign: 'right',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    border: '1px solid var(--border)',
                                                                    backgroundColor: 'var(--bg)',
                                                                    color: 'var(--text)',
                                                                    fontSize: '13px',
                                                                    fontVariantNumeric: 'tabular-nums'
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                            {Number(it.subtotalRealisasi || 0).toLocaleString('id-ID')}
                                                        </td>
                                                    </tr>
                                                );
                                            }).concat(
                                                <tr key={`total-${po.id}`} style={{ backgroundColor: 'rgba(79,70,229,0.06)' }}>
                                                    <td colSpan="7" style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                                                        Total {po.nomorPo}:
                                                    </td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                        Rp{Number(po.total || 0).toLocaleString('id-ID')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px',
                            borderTop: '1px solid var(--border)',
                            paddingTop: '14px'
                        }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                                {bulkData.length > 0 && (
                                    <>Total: <span style={{ color: 'var(--color-primary, #4f46e5)' }}>Rp{bulkData.reduce((s, po) => s + Number(po.total || 0), 0).toLocaleString('id-ID')}</span></>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => { setBulkModalOpen(false); setBulkData([]); }}
                                    disabled={bulkSaving}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '14px'
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBulkGenerate}
                                    disabled={bulkLoading || bulkSaving || bulkData.length === 0}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: bulkData.length === 0 ? 'var(--text-muted)' : 'var(--btn-primary-bg)',
                                        color: 'var(--btn-primary-text)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: bulkData.length === 0 ? 'not-allowed' : 'pointer',
                                        fontWeight: 700,
                                        fontSize: '14px'
                                    }}
                                >
                                    Generate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirmModal.open}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm || (() => {})}
                onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
            />

            <ConfirmDialog
                open={bulkConfirm.open}
                title="Konfirmasi Generate Bulk Jurnal"
                message={`Apakah data sudah benar? ${bulkConfirm.count} PO akan di-jurnal sekaligus.`}
                onConfirm={confirmBulkGenerate}
                onCancel={() => setBulkConfirm(prev => ({ ...prev, open: false }))}
            />
        </div>
    );
};
