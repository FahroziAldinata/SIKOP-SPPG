import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';
import { Skeleton } from '../../components/Skeleton';
import { ConfirmDialog } from '../../components/ConfirmDialog';


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
    const [saldoAwalForm, setSaldoAwalForm] = useState({
        bahanPokokId: '',
        saldoAwalQty: '',
        hargaBeliAwal: ''
    });

    // Delete confirmation state
    const [deleteItem, setDeleteItem] = useState(null);

    // Bulk items state
    const [bulkItems, setBulkItems] = useState([
        { bahanPokokId: '', saldoAwalQty: '', hargaBeliAwal: '' }
    ]);
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
        if (!newNama.trim() || !newSatuan.trim()) {
            toast.error('Nama dan Satuan wajib diisi.');
            return;
        }
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
                if (resB.ok) {
                    const dataB = await resB.json();
                    setBahanPokokList(dataB);
                }
                setIsAddBahanModalOpen(false);
                setNewNama('');
                setNewSatuan('');
                setNewTipePenyimpanan('HABIS_HARI_ITU');
                setNewSatuanHitungan('');
                setNewKonversiPerKg('');
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
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
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
        if (periodeId) {
            loadSaldoAwalList(periodeId);
        }
    }, [periodeId]);

    // Handle single form submit (Create or Update)
    const handleCreateOrUpdateSaldoAwal = async (e) => {
        e.preventDefault();
        const { bahanPokokId, saldoAwalQty, hargaBeliAwal } = saldoAwalForm;

        if (!periodeId) {
            toast.error('Periode wajib dipilih.');
            return;
        }
        if (!bahanPokokId && !editId) {
            toast.error('Bahan pokok wajib dipilih.');
            return;
        }
        if (saldoAwalQty === undefined || saldoAwalQty === null || saldoAwalQty === '') {
            toast.error('Saldo awal qty wajib diisi.');
            return;
        }
        if (hargaBeliAwal === undefined || hargaBeliAwal === null || hargaBeliAwal === '') {
            toast.error('Harga beli awal wajib diisi.');
            return;
        }

        const valQty = parseFloat(saldoAwalQty);
        const valHarga = parseFloat(hargaBeliAwal);

        if (isNaN(valQty) || valQty < 0) {
            toast.error('Saldo awal qty harus berupa angka non-negatif.');
            return;
        }
        if (isNaN(valHarga) || valHarga < 0) {
            toast.error('Harga beli awal harus berupa angka non-negatif.');
            return;
        }

        try {
            let r;
            if (editId) {
                // Update mode
                r = await request(`/akuntan/saldo-awal-barang/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        saldoAwalQty: valQty,
                        hargaBeliAwal: valHarga
                    })
                });
            } else {
                // Create mode
                r = await request('/akuntan/saldo-awal-barang', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        periodeId,
                        bahanPokokId,
                        saldoAwalQty: valQty,
                        hargaBeliAwal: valHarga
                    })
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
        setSaldoAwalForm({
            bahanPokokId: row.bahanPokokId,
            saldoAwalQty: String(row.saldoAwalQty),
            hargaBeliAwal: String(row.hargaBeliAwal)
        });
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
            const r = await request(`/akuntan/saldo-awal-barang/${deleteItem.id}`, {
                method: 'DELETE'
            });
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
    const handleAddBulkRow = () => {
        setBulkItems(prev => [...prev, { bahanPokokId: '', saldoAwalQty: '', hargaBeliAwal: '' }]);
    };

    const handleRemoveBulkRow = (index) => {
        setBulkItems(prev => prev.filter((_, i) => i !== index));
    };

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

        if (!periodeId) {
            toast.error('Periode wajib dipilih.');
            return;
        }

        const validItems = bulkItems.filter(item => item.bahanPokokId && item.saldoAwalQty !== '' && item.hargaBeliAwal !== '');

        if (validItems.length === 0) {
            toast.error('Isi setidaknya 1 baris bahan pokok lengkap.');
            return;
        }

        const formattedItems = validItems.map(item => ({
            bahanPokokId: item.bahanPokokId,
            saldoAwalQty: parseFloat(item.saldoAwalQty),
            hargaBeliAwal: parseFloat(item.hargaBeliAwal)
        }));

        const hasInvalidNumbers = formattedItems.some(i => isNaN(i.saldoAwalQty) || i.saldoAwalQty < 0 || isNaN(i.hargaBeliAwal) || i.hargaBeliAwal < 0);
        if (hasInvalidNumbers) {
            toast.error('Qty dan Harga Beli harus berupa angka non-negatif.');
            return;
        }

        setBulkSubmitting(true);
        try {
            const r = await request('/akuntan/saldo-awal-barang/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodeId,
                    items: formattedItems
                })
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
                        padding: '10px 18px',
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    + Tambah Bahan Baru
                </button>
            </div>

            {/* Selection Periode & Header Identitas */}
            <div style={{
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                marginBottom: '30px'
            }}>
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    backgroundColor: 'var(--bg-elevated)',
                    boxShadow: 'var(--shadow)',
                    flex: '1 1 300px'
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
                        Pilih Periode Aktif
                    </label>
                    <Dropdown
                        style={{ width: '100%' }}
                        value={periodeId}
                        onChange={val => {
                            setPeriodeId(val);
                            handleCancelEdit();
                        }}
                        options={periods.map(p => ({ value: p.id, label: `${p.tanggalMulai} - ${p.tanggalSelesai}` }))}
                    />
                </div>

                {/* Header Identitas SPPG + Periode */}
                {selectedPeriod && (
                    <div style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '20px',
                        backgroundColor: 'var(--bg-elevated)',
                        boxShadow: 'var(--shadow)',
                        flex: '2 1 400px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '6px'
                    }}>
                        <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                            Identitas Laporan Persediaan
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                            {selectedPeriod.setupLembaga?.namaLembaga || 'SPPG (Lembaga Terdaftar)'}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Periode: <strong>{selectedPeriod.tanggalMulai}</strong> s.d. <strong>{selectedPeriod.tanggalSelesai}</strong>
                        </div>
                    </div>
                )}
            </div>

            {/* Form Single Saldo Awal (Create/Edit) */}
            <form onSubmit={handleCreateOrUpdateSaldoAwal} style={{
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
                        {editId ? 'Edit Saldo Awal Barang' : 'Input Saldo Awal Barang (Single)'}
                    </h3>
                    {editId && (
                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(234,179,8,0.15)', color: '#ca8a04', fontWeight: 600 }}>
                            Mode Edit Active
                        </span>
                    )}
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
                            Bahan Pokok
                        </label>
                        <Dropdown
                            style={{ width: '100%' }}
                            value={saldoAwalForm.bahanPokokId}
                            onChange={val => setSaldoAwalForm(prev => ({ ...prev, bahanPokokId: val }))}
                            disabled={!!editId}
                            searchable={true}
                            placeholder="-- Pilih Bahan Pokok --"
                            options={[
                                { value: '', label: '-- Pilih Bahan Pokok --' },
                                ...bahanPokokList.map(b => ({ value: b.id, label: `${b.nama} (${b.satuan})` }))
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
                            Saldo Awal Qty
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="Jumlah Stok Awal"
                            value={saldoAwalForm.saldoAwalQty}
                            onChange={e => setSaldoAwalForm(prev => ({ ...prev, saldoAwalQty: e.target.value }))}
                            required
                            className="form-field"
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
                            Harga Beli Awal (Rp)
                        </label>
                        <NumberInput
                            placeholder="Harga Beli Awal"
                            value={saldoAwalForm.hargaBeliAwal}
                            onChange={val => setSaldoAwalForm(prev => ({ ...prev, hargaBeliAwal: val }))}
                            required
                            className="form-field"
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
                        {editId ? 'Update Saldo Awal' : 'Simpan Saldo Awal'}
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

            {/* Form Bulk Multi-baris */}
            <form onSubmit={handleBulkSubmit} style={{
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
                <div>
                    <h3 style={{ margin: 0, color: 'var(--text)' }}>Input Banyak Sekaligus (Bulk)</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                        Input saldo awal untuk beberapa bahan pokok secara bersamaan. Data yang sudah ada akan ter-update otomatis.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {bulkItems.map((item, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            padding: '12px',
                            backgroundColor: 'var(--bg)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)'
                        }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', minWidth: '24px' }}>
                                #{idx + 1}
                            </span>
                            <div style={{ flex: '2 1 200px' }}>
                                <Dropdown
                                    style={{ width: '100%' }}
                                    value={item.bahanPokokId}
                                    onChange={val => handleBulkItemChange(idx, 'bahanPokokId', val)}
                                    searchable={true}
                                    placeholder="-- Pilih Bahan Pokok --"
                                    options={[
                                        { value: '', label: '-- Pilih Bahan Pokok --' },
                                        ...bahanPokokList.map(b => ({ value: b.id, label: `${b.nama} (${b.satuan})` }))
                                    ]}
                                />
                            </div>
                            <div style={{ flex: '1 1 140px' }}>
                                <input
                                    type="number"
                                    step="0.001"
                                    placeholder="Qty Saldo Awal"
                                    value={item.saldoAwalQty}
                                    onChange={e => handleBulkItemChange(idx, 'saldoAwalQty', e.target.value)}
                                    className="form-field"
                                />
                            </div>
                            <div style={{ flex: '1 1 160px' }}>
                                <NumberInput
                                    placeholder="Harga Beli Awal (Rp)"
                                    value={item.hargaBeliAwal}
                                    onChange={val => handleBulkItemChange(idx, 'hargaBeliAwal', val)}
                                    className="form-field"
                                />
                            </div>
                            {bulkItems.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveBulkRow(idx)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        color: 'var(--color-danger)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '14px'
                                    }}
                                    title="Hapus baris ini"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                    <button
                        type="button"
                        onClick={handleAddBulkRow}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--bg)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px'
                        }}
                    >
                        + Tambah Baris
                    </button>
                    <button
                        type="submit"
                        disabled={bulkSubmitting}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--btn-primary-bg)',
                            color: 'var(--btn-primary-text)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: bulkSubmitting ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            opacity: bulkSubmitting ? 0.7 : 1
                        }}
                    >
                        {bulkSubmitting ? 'Memproses...' : 'Simpan Semua Bulk'}
                    </button>
                </div>
            </form>

            {/* List Saldo Awal */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Saldo Awal Barang Terdaftar</h3>
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}
            {!loading && <Table
                columns={[
                    { key: 'bahanPokok', header: 'Nama Bahan Pokok', render: (v) => v ? v.nama : '—' },
                    { key: 'bahanPokokSatuan', header: 'Satuan', align: 'center', width: '100px', render: (_, row) => row.bahanPokok ? row.bahanPokok.satuan : '—' },
                    {
                        key: 'saldoAwalQty',
                        header: 'Saldo Awal (Qty)',
                        align: 'right',
                        render: (v) => (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                {Number(v).toLocaleString('id-ID')}
                            </span>
                        )
                    },
                    {
                        key: 'hargaBeliAwal',
                        header: 'Harga Beli Awal',
                        align: 'right',
                        render: (v) => (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                Rp{Number(v).toLocaleString('id-ID')}
                            </span>
                        )
                    },
                    {
                        key: 'id',
                        header: 'Total Nilai Saldo Awal',
                        align: 'right',
                        render: (_, row) => {
                            const totalNilai = Number(row.saldoAwalQty) * Number(row.hargaBeliAwal);
                            return (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{totalNilai.toLocaleString('id-ID')}
                                </strong>
                            );
                        }
                    },
                    {
                        key: 'aksi',
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
                                    onClick={() => setDeleteItem({ id: row.id, nama: row.bahanPokok?.nama })}
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
                data={saldoAwalList}
                emptyText="Belum ada data saldo awal barang untuk periode ini."
            />}

            {/* Modal Tambah Bahan Baru */}
            {isAddBahanModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10000,
                }}>
                    <form onSubmit={handleCreateBahanPokok} style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '24px', width: '90%', maxWidth: '500px',
                        boxShadow: 'var(--shadow-hover)',
                        display: 'flex', flexDirection: 'column', gap: '16px'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                            Tambah Bahan Pokok Baru
                        </h3>

                        <div>
                            <label style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nama Bahan *</label>
                            <input type="text" className="form-field" placeholder="Contoh: Beras Premium" value={newNama} onChange={(e) => setNewNama(e.target.value)} required />
                        </div>

                        <div>
                            <label style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Satuan *</label>
                            <input type="text" className="form-field" placeholder="Contoh: kg, liter, butir" value={newSatuan} onChange={(e) => setNewSatuan(e.target.value)} required />
                        </div>

                        <div>
                            <label style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Tipe Penyimpanan</label>
                            <Dropdown
                                value={newTipePenyimpanan}
                                onChange={setNewTipePenyimpanan}
                                options={[
                                    { value: 'HABIS_HARI_ITU', label: 'Habis Hari Itu (JIT)' },
                                    { value: 'STOK_GUDANG', label: 'Stok Gudang (Tahan Lama)' }
                                ]}
                            />
                        </div>

                        <div>
                            <label style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Satuan Hitungan (opsional, misal: BUTIR)</label>
                            <input type="text" className="form-field" placeholder="Contoh: BUTIR" value={newSatuanHitungan} onChange={(e) => setNewSatuanHitungan(e.target.value)} />
                        </div>

                        <div>
                            <label style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Konversi Per Kg (opsional, misal: 15)</label>
                            <input type="number" step="0.001" className="form-field" placeholder="Contoh: 15" value={newKonversiPerKg} onChange={(e) => setNewKonversiPerKg(e.target.value)} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button type="button" onClick={() => setIsAddBahanModalOpen(false)} style={{ padding: '9px 16px', backgroundColor: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)', color: 'var(--btn-cancel-text)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Batal</button>
                            <button type="submit" style={{ padding: '9px 16px', backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Simpan</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Confirm Delete Dialog */}
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
