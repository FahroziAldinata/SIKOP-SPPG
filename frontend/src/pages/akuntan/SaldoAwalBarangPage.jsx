import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PeriodeSelector } from '../../components/akuntan/saldoAwal/PeriodeSelector';
import { SaldoAwalForm } from '../../components/akuntan/saldoAwal/SaldoAwalForm';
import { SaldoAwalBulkForm } from '../../components/akuntan/saldoAwal/SaldoAwalBulkForm';
import { SaldoAwalTable } from '../../components/akuntan/saldoAwal/SaldoAwalTable';
import { TambahBahanModal } from '../../components/akuntan/saldoAwal/TambahBahanModal';

export const SaldoAwalBarangPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [bahanPokokList, setBahanPokokList] = useState([]);
    const [saldoAwalList, setSaldoAwalList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Single Edit / Create state
    const [editId, setEditId] = useState(null);
    const [saldoAwalForm, setSaldoAwalForm] = useState({ bahanPokokId: '', saldoAwalQty: '', hargaBeliAwal: '' });

    // Delete confirmation state
    const [deleteItem, setDeleteItem] = useState(null);

    // Bulk items state
    const [bulkItems, setBulkItems] = useState([{ bahanPokokId: '', saldoAwalQty: '', hargaBeliAwal: '' }]);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);

    // State for Tambah Bahan Baru Modal
    const [isAddBahanModalOpen, setIsAddBahanModalOpen] = useState(false);
    const [newNama, setNewNama] = useState('');
    const [newSatuan, setNewSatuan] = useState('');
    const [newTipePenyimpanan, setNewTipePenyimpanan] = useState('HABIS_HARI_ITU');
    const [newSatuanHitungan, setNewSatuanHitungan] = useState('');
    const [newKonversiPerKg, setNewKonversiPerKg] = useState('');

    const handleCreateBahanPokok = async (e) => {
        e.preventDefault();
        if (!newNama.trim() || !newSatuan.trim()) return toast.error('Nama dan Satuan wajib diisi.');
        try {
            const res = await request('/akuntan/bahan-pokok', {
                method: 'POST',
                body: JSON.stringify({
                    nama: newNama.trim(),
                    satuan: newSatuan.trim(),
                    tipePenyimpanan: newTipePenyimpanan || 'HABIS_HARI_ITU',
                    satuanHitungan: newSatuanHitungan.trim() || null,
                    konversiPerKg: newKonversiPerKg !== '' ? parseFloat(newKonversiPerKg) : null
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Bahan pokok baru berhasil ditambahkan.');
                const resB = await request('/mitra/bahan-pokok');
                if (resB.ok) setBahanPokokList(await resB.json());
                setIsAddBahanModalOpen(false);
                setNewNama(''); setNewSatuan(''); setNewTipePenyimpanan('HABIS_HARI_ITU');
                setNewSatuanHitungan(''); setNewKonversiPerKg('');
            } else {
                toast.error(data.error || 'Gagal menambahkan bahan pokok baru.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Koneksi ke server gagal.');
        }
    };

    // Selected period details
    const selectedPeriod = periods.find(p => p.id === periodeId);

    // Fetch periods & materials on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => { setPeriods(d); if (d.length) setPeriodeId(d[0].id); })
            .catch(() => toast.error('Gagal memuat daftar periode.'));

        request('/mitra/bahan-pokok')
            .then(r => r.json())
            .then(d => setBahanPokokList(d))
            .catch(() => { });
    }, []);

    const loadSaldoAwalList = async (pid) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/akuntan/saldo-awal-barang?periodeId=${pid}`);
            if (r.ok) {
                setSaldoAwalList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat riwayat saldo awal' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    // Load initial stock list when period changes
    useEffect(() => {
        if (periodeId) loadSaldoAwalList(periodeId);
    }, [periodeId]);

    // Handle single form submit (Create or Update)
    const handleCreateOrUpdateSaldoAwal = async (e) => {
        e.preventDefault();
        const { bahanPokokId, saldoAwalQty, hargaBeliAwal } = saldoAwalForm;

        if (!periodeId) return toast.error('Periode wajib dipilih.');
        if (!bahanPokokId && !editId) return toast.error('Bahan pokok wajib dipilih.');
        if (saldoAwalQty === undefined || saldoAwalQty === null || saldoAwalQty === '') return toast.error('Saldo awal qty wajib diisi.');
        if (hargaBeliAwal === undefined || hargaBeliAwal === null || hargaBeliAwal === '') return toast.error('Harga beli awal wajib diisi.');

        const valQty = parseFloat(saldoAwalQty);
        const valHarga = parseFloat(hargaBeliAwal);

        if (isNaN(valQty) || valQty < 0) return toast.error('Saldo awal qty harus berupa angka non-negatif.');
        if (isNaN(valHarga) || valHarga < 0) return toast.error('Harga beli awal harus berupa angka non-negatif.');

        try {
            let r;
            if (editId) {
                r = await request(`/akuntan/saldo-awal-barang/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ saldoAwalQty: valQty, hargaBeliAwal: valHarga })
                });
            } else {
                r = await request('/akuntan/saldo-awal-barang', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ periodeId, bahanPokokId, saldoAwalQty: valQty, hargaBeliAwal: valHarga })
                });
            }

            if (r.ok) {
                toast.success(editId ? 'Saldo Awal Barang berhasil diperbarui.' : 'Saldo Awal Barang berhasil disimpan.');
                handleCancelEdit();
                loadSaldoAwalList(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                toast.error(d.error || 'Gagal menyimpan Saldo Awal Barang');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // Start editing a row
    const handleStartEdit = (row) => {
        setEditId(row.id);
        setSaldoAwalForm({ bahanPokokId: row.bahanPokokId, saldoAwalQty: String(row.saldoAwalQty), hargaBeliAwal: String(row.hargaBeliAwal) });
    };

    // Cancel edit mode
    const handleCancelEdit = () => {
        setEditId(null);
        setSaldoAwalForm({ bahanPokokId: '', saldoAwalQty: '', hargaBeliAwal: '' });
    };

    // Confirm & process deletion
    const handleConfirmDelete = async () => {
        if (!deleteItem) return;
        try {
            const r = await request(`/akuntan/saldo-awal-barang/${deleteItem.id}`, { method: 'DELETE' });
            if (r.ok) {
                toast.success('Saldo awal barang berhasil dihapus.');
                loadSaldoAwalList(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal menghapus data' }));
                toast.error(d.error || 'Gagal menghapus data');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setDeleteItem(null);
        }
    };

    // Bulk form row operations
    const handleAddBulkRow = () => setBulkItems(prev => [...prev, { bahanPokokId: '', saldoAwalQty: '', hargaBeliAwal: '' }]);
    const handleRemoveBulkRow = (index) => setBulkItems(prev => prev.filter((_, i) => i !== index));
    const handleBulkItemChange = (index, field, value) => {
        setBulkItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // Handle Bulk submit
    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        if (!periodeId) return toast.error('Periode wajib dipilih.');

        const validItems = bulkItems.filter(item => item.bahanPokokId && item.saldoAwalQty !== '' && item.hargaBeliAwal !== '');
        if (validItems.length === 0) return toast.error('Isi setidaknya 1 baris bahan pokok lengkap.');

        const formattedItems = validItems.map(item => ({
            bahanPokokId: item.bahanPokokId,
            saldoAwalQty: parseFloat(item.saldoAwalQty),
            hargaBeliAwal: parseFloat(item.hargaBeliAwal)
        }));

        const hasInvalidNumbers = formattedItems.some(i => isNaN(i.saldoAwalQty) || i.saldoAwalQty < 0 || isNaN(i.hargaBeliAwal) || i.hargaBeliAwal < 0);
        if (hasInvalidNumbers) return toast.error('Qty dan Harga Beli harus berupa angka non-negatif.');

        setBulkSubmitting(true);
        try {
            const r = await request('/akuntan/saldo-awal-barang/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periodeId, items: formattedItems })
            });

            const d = await r.json();
            if (r.ok && d.success) {
                toast.success(`${d.berhasil} data berhasil, ${d.gagal} gagal disimpan.`);
                setBulkItems([{ bahanPokokId: '', saldoAwalQty: '', hargaBeliAwal: '' }]);
                loadSaldoAwalList(periodeId);
            } else {
                toast.error(d.error || 'Gagal memproses simpan bulk saldo awal.');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setBulkSubmitting(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'var(--text)', margin: 0 }}>Input Saldo Awal Barang (Persediaan Awal)</h2>
                <button
                    type="button"
                    onClick={() => setIsAddBahanModalOpen(true)}
                    style={{
                        padding: '10px 18px', backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
                        border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                        display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    + Tambah Bahan Baru
                </button>
            </div>

            <PeriodeSelector
                periods={periods} periodeId={periodeId} selectedPeriod={selectedPeriod}
                onPeriodeChange={(val) => { setPeriodeId(val); handleCancelEdit(); }}
            />

            <SaldoAwalForm
                editId={editId} saldoAwalForm={saldoAwalForm} bahanPokokList={bahanPokokList}
                onFormFieldChange={(field, val) => setSaldoAwalForm(prev => ({ ...prev, [field]: val }))}
                onSubmit={handleCreateOrUpdateSaldoAwal} onCancelEdit={handleCancelEdit}
            />

            <SaldoAwalBulkForm
                bulkItems={bulkItems} bahanPokokList={bahanPokokList} bulkSubmitting={bulkSubmitting}
                onAddRow={handleAddBulkRow} onRemoveRow={handleRemoveBulkRow}
                onItemChange={handleBulkItemChange} onSubmit={handleBulkSubmit}
            />

            <SaldoAwalTable
                loading={loading} saldoAwalList={saldoAwalList} onEdit={handleStartEdit}
                onDelete={(row) => setDeleteItem({ id: row.id, nama: row.bahanPokok?.nama })}
            />

            <TambahBahanModal
                isOpen={isAddBahanModalOpen} newNama={newNama} onNewNamaChange={setNewNama}
                newSatuan={newSatuan} onNewSatuanChange={setNewSatuan}
                newTipePenyimpanan={newTipePenyimpanan} onNewTipePenyimpananChange={setNewTipePenyimpanan}
                newSatuanHitungan={newSatuanHitungan} onNewSatuanHitunganChange={setNewSatuanHitungan}
                newKonversiPerKg={newKonversiPerKg} onNewKonversiPerKgChange={setNewKonversiPerKg}
                onSubmit={handleCreateBahanPokok} onClose={() => setIsAddBahanModalOpen(false)}
            />

            <ConfirmDialog
                open={!!deleteItem}
                title="Konfirmasi Hapus Saldo Awal"
                message={`Apakah Anda yakin ingin menghapus data saldo awal barang ${deleteItem?.nama ? `"${deleteItem.nama}"` : ''}?`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteItem(null)}
            />
        </div>
    );
};
