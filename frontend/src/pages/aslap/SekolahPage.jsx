import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PeriodeFilterBar } from '../../components/aslap/sekolah/PeriodeFilterBar';
import { SekolahTable } from '../../components/aslap/sekolah/SekolahTable';
import { SekolahFormModal } from '../../components/aslap/sekolah/SekolahFormModal';
import { KelasFormModal } from '../../components/aslap/sekolah/KelasFormModal';

export const SekolahPage = () => {
  const { request } = useApi();
  const toast = useToast();

  // State Sekolah
  const [sekolahList, setSekolahList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formNama, setFormNama] = useState('');
  const [formJenjang, setFormJenjang] = useState('');
  const [formNpsn, setFormNpsn] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // State tambahan untuk gabungan Sekolah & Kelas
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [periodeOptions, setPeriodeOptions] = useState([]);
  const [kelasMap, setKelasMap] = useState({});
  const [expandedSekolahId, setExpandedSekolahId] = useState(null);
  const [kelasModalOpen, setKelasModalOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState(null);
  const [formKelasNama, setFormKelasNama] = useState('');
  const [formKelasJumlah, setFormKelasJumlah] = useState(0);
  const [kelasLoading, setKelasLoading] = useState(false);
  const [targetSekolahId, setTargetSekolahId] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  // Fetch master Sekolah
  const fetchSekolah = async () => {
    setLoading(true);
    try {
      const res = await request('/aslap/sekolah');
      if (res.ok) {
        const data = await res.json();
        setSekolahList(data);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal mengambil data sekolah.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Koneksi ke server gagal.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch master Periode
  const fetchPeriode = async () => {
    try {
      const res = await request('/aslap/periode');
      if (res.ok) {
        const data = await res.json();
        const options = data.map(p => ({
          value: p.id,
          label: `${p.tanggalMulai} s/d ${p.tanggalSelesai}`
        }));
        setPeriodeOptions(options);
        if (options.length > 0) {
          setSelectedPeriodId(options[0].value);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSekolah();
    fetchPeriode();
  }, []);

  // Fetch detail kelas untuk sekolah tertentu
  const fetchKelasDetail = async (periodeId, sekolahId) => {
    if (!periodeId || !sekolahId) return;
    setKelasLoading(true);
    try {
      const res = await request(`/aslap/sekolah-kelas-detail?periodeId=${periodeId}&sekolahId=${sekolahId}`);
      if (res.ok) {
        const data = await res.json();
        setKelasMap(prev => ({
          ...prev,
          [sekolahId]: data
        }));
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal mengambil detail kelas.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Koneksi ke server gagal.');
    } finally {
      setKelasLoading(false);
    }
  };

  // Toggle expand row sekolah
  const handleToggleExpand = async (sekolahId) => {
    if (expandedSekolahId === sekolahId) {
      setExpandedSekolahId(null);
      return;
    }

    setExpandedSekolahId(sekolahId);

    if (!selectedPeriodId) {
      toast.error('Pilih periode terlebih dahulu.');
      return;
    }

    fetchKelasDetail(selectedPeriodId, sekolahId);
  };

  // Handle ganti periode dropdown
  const handlePeriodChange = (val) => {
    setSelectedPeriodId(val);
    setKelasMap({});
    if (expandedSekolahId) {
      fetchKelasDetail(val, expandedSekolahId);
    }
  };

  // Modal Sekolah (Tambah/Edit)
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormNama('');
    setFormJenjang('');
    setFormNpsn('');
    setFormAlamat('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormJenjang(item.jenjang);
    setFormNpsn(item.npsn || '');
    setFormAlamat(item.alamat || '');
    setModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formNama.trim()) {
      toast.error('Nama sekolah wajib diisi.');
      return;
    }
    if (!formJenjang) {
      toast.error('Jenjang wajib diisi.');
      return;
    }
    if (formNpsn && !/^\d{8}$/.test(formNpsn.trim())) {
      toast.error('NPSN harus 8 digit angka.');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = !!editingItem;
      const url = isEdit ? `/aslap/sekolah/${editingItem.id}` : '/aslap/sekolah';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        nama: formNama.trim(),
        jenjang: formJenjang,
        ...(formNpsn.trim() && { npsn: formNpsn.trim() }),
        alamat: formAlamat.trim() || undefined
      };

      const res = await request(url, {
        method,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(isEdit ? 'Sekolah berhasil diperbarui.' : 'Sekolah berhasil ditambahkan.');
        setModalOpen(false);
        fetchSekolah();
      } else {
        toast.error(data.error || 'Gagal menyimpan sekolah.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan koneksi ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmModal({
      open: true,
      title: 'Konfirmasi Hapus Sekolah',
      message: 'Apakah Anda yakin ingin menghapus sekolah ini? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await request(`/aslap/sekolah/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            toast.success('Sekolah berhasil dihapus.');
            fetchSekolah();
          } else {
            const errData = await res.json();
            toast.error(errData.error || 'Gagal menghapus sekolah.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Terjadi kesalahan koneksi.');
        }
      }
    });
  };

  // Modal Kelas (Tambah/Edit)
  const handleOpenAddKelasModal = (sekolahId) => {
    if (!selectedPeriodId) {
      toast.error('Pilih periode terlebih dahulu.');
      return;
    }
    setEditingKelas(null);
    setFormKelasNama('');
    setFormKelasJumlah(0);
    setTargetSekolahId(sekolahId);
    setKelasModalOpen(true);
  };

  const handleOpenEditKelasModal = (kelasItem, sekolahId) => {
    setEditingKelas(kelasItem);
    setFormKelasNama(kelasItem.namaKelas);
    setFormKelasJumlah(kelasItem.jumlah);
    setTargetSekolahId(sekolahId);
    setKelasModalOpen(true);
  };

  const handleSubmitKelasForm = async (e) => {
    e.preventDefault();
    if (!formKelasNama.trim()) {
      toast.error('Kategori wajib dipilih.');
      return;
    }
    const numJumlah = parseInt(formKelasJumlah, 10);
    if (isNaN(numJumlah) || numJumlah <= 0) {
      toast.error('Jumlah wajib diisi dan harus lebih besar dari 0.');
      return;
    }

    const sId = targetSekolahId || expandedSekolahId;
    const existingKelasList = kelasMap[sId] || [];
    const isDuplicate = existingKelasList.some(k => 
      k.namaKelas === formKelasNama.trim() && (!editingKelas || k.id !== editingKelas.id)
    );
    if (isDuplicate) {
      toast.error('Kategori kelas ini sudah terdaftar di sekolah ini.');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = !!editingKelas;
      const url = isEdit
        ? `/aslap/sekolah-kelas-detail/${editingKelas.id}`
        : '/aslap/sekolah-kelas-detail';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        periodeId: selectedPeriodId,
        sekolahId: sId,
        namaKelas: formKelasNama.trim(),
        jumlah: numJumlah
      };

      const res = await request(url, {
        method,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(isEdit ? 'Detail kelas berhasil diperbarui.' : 'Detail kelas berhasil ditambahkan.');
        setKelasModalOpen(false);
        fetchKelasDetail(selectedPeriodId, sId);
      } else {
        toast.error(data.error || 'Gagal menyimpan detail kelas.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan koneksi ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKelasClick = (kelasId, sekolahId) => {
    setConfirmModal({
      open: true,
      title: 'Konfirmasi Hapus Kelas',
      message: 'Apakah Anda yakin ingin menghapus detail kelas ini?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await request(`/aslap/sekolah-kelas-detail/${kelasId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            toast.success('Detail kelas berhasil dihapus.');
            fetchKelasDetail(selectedPeriodId, sekolahId);
          } else {
            const errData = await res.json();
            toast.error(errData.error || 'Gagal menghapus detail kelas.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Terjadi kesalahan koneksi.');
        }
      }
    });
  };

  return (
    <div>
      <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Data Sekolah &amp; Rincian Kelas</h2>

      {/* Filter Dropdown Periode */}
      <PeriodeFilterBar
        selectedPeriodId={selectedPeriodId}
        handlePeriodChange={handlePeriodChange}
        periodeOptions={periodeOptions}
      />

      {/* Header Tabel Sekolah & Tombol Tambah */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '18px' }}>
          Daftar Sekolah
        </h3>
        <button
          type="button"
          onClick={handleOpenAddModal}
          style={{
            padding: '10px 18px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px'
          }}
        >
          + Tambah Sekolah Baru
        </button>
      </div>

      {/* Tabel Utama Sekolah */}
      <SekolahTable
        loading={loading}
        sekolahList={sekolahList}
        expandedSekolahId={expandedSekolahId}
        handleToggleExpand={handleToggleExpand}
        handleOpenEditModal={handleOpenEditModal}
        handleDeleteClick={handleDeleteClick}
        handleOpenAddKelasModal={handleOpenAddKelasModal}
        kelasLoading={kelasLoading}
        kelasMap={kelasMap}
        handleOpenEditKelasModal={handleOpenEditKelasModal}
        handleDeleteKelasClick={handleDeleteKelasClick}
      />

      {/* Modal Form Tambah / Edit Sekolah */}
      <SekolahFormModal
        modalOpen={modalOpen}
        editingItem={editingItem}
        formNama={formNama}
        formJenjang={formJenjang}
        formNpsn={formNpsn}
        formAlamat={formAlamat}
        setFormNama={setFormNama}
        setFormJenjang={setFormJenjang}
        setFormNpsn={setFormNpsn}
        setFormAlamat={setFormAlamat}
        handleSubmitForm={handleSubmitForm}
        setModalOpen={setModalOpen}
        submitting={submitting}
      />

      {/* Modal Form Tambah / Edit Kelas */}
      <KelasFormModal
        kelasModalOpen={kelasModalOpen}
        editingKelas={editingKelas}
        formKelasNama={formKelasNama}
        formKelasJumlah={formKelasJumlah}
        setFormKelasNama={setFormKelasNama}
        setFormKelasJumlah={setFormKelasJumlah}
        handleSubmitKelasForm={handleSubmitKelasForm}
        setKelasModalOpen={setKelasModalOpen}
        targetSekolahId={targetSekolahId}
        expandedSekolahId={expandedSekolahId}
        sekolahList={sekolahList}
        submitting={submitting}
      />

      {/* Confirm Dialog Hapus */}
      <ConfirmDialog
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm || (() => {})}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
};
