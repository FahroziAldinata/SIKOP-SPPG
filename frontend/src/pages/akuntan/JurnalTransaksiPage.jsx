import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PeriodeFilter } from '../../components/akuntan/jurnal/PeriodeFilter';
import { JurnalForm } from '../../components/akuntan/jurnal/JurnalForm';
import { JurnalTable } from '../../components/akuntan/jurnal/JurnalTable';
import { BulkJurnalModal } from '../../components/akuntan/jurnal/BulkJurnalModal';

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
            <PeriodeFilter
                periodeId={periodeId}
                setPeriodeId={setPeriodeId}
                periods={periods}
            />

            {/* Form Jurnal (Create / Edit) */}
            <JurnalForm
                jurnalForm={jurnalForm}
                setJurnalForm={setJurnalForm}
                editId={editId}
                akunList={akunList}
                selectedPrefillPoId={selectedPrefillPoId}
                setSelectedPrefillPoId={setSelectedPrefillPoId}
                realizedPoList={realizedPoList}
                activePeriod={activePeriod}
                handlePrefillFromPo={handlePrefillFromPo}
                openBulkModal={openBulkModal}
                handleCancelEdit={handleCancelEdit}
                saveJurnal={saveJurnal}
                periodeId={periodeId}
            />

            {/* List Jurnal */}
            <JurnalTable
                loading={loading}
                jurnalList={jurnalList}
                handleStartEdit={handleStartEdit}
                handleDelete={handleDelete}
                pagination={pagination}
                setPage={setPage}
                loadJurnal={loadJurnal}
                periodeId={periodeId}
            />

            {/* Modal Bulk Generate Jurnal */}
            <BulkJurnalModal
                bulkModalOpen={bulkModalOpen}
                bulkLoading={bulkLoading}
                bulkData={bulkData}
                bulkSaving={bulkSaving}
                setBulkModalOpen={setBulkModalOpen}
                setBulkData={setBulkData}
                handleBulkHargaChange={handleBulkHargaChange}
                handleBulkGenerate={handleBulkGenerate}
            />

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
