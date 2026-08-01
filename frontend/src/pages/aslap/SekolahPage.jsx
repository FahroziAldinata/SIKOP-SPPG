import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';
import { Skeleton } from '../../components/Skeleton';
import { ConfirmDialog } from '../../components/ConfirmDialog';

const JENJANG_OPTIONS = ['TK', 'SD', 'SMP', 'SMA_SMK'];

const getCategoryOptions = (jenjang) => {
  switch (jenjang) {
    case 'TK':
      return [
        { label: 'PAUD/TK (Porsi Kecil)', value: 'PAUD_TK' },
        { label: 'Pendidik (Porsi Besar)', value: 'PENDIDIK' },
        { label: 'PIC (Porsi Besar)', value: 'TENAGA_KEPENDIDIKAN' }
      ];
    case 'SD':
      return [
        { label: 'Kelas 1-3 (Porsi Kecil)', value: 'SD_1_3' },
        { label: 'Kelas 4-6 (Porsi Besar)', value: 'SD_4_6' },
        { label: 'Pendidik (Porsi Besar)', value: 'PENDIDIK' },
        { label: 'PIC (Porsi Besar)', value: 'TENAGA_KEPENDIDIKAN' }
      ];
    case 'SMP':
      return [
        { label: 'Kelas 1-3 (Porsi Besar)', value: 'SMP_1_3' },
        { label: 'Pendidik (Porsi Besar)', value: 'PENDIDIK' },
        { label: 'PIC (Porsi Besar)', value: 'TENAGA_KEPENDIDIKAN' }
      ];
    case 'SMA_SMK':
    default:
      return [
        { label: 'Kelas 4-6 (Porsi Besar)', value: 'SMA_SMK_4_6' },
        { label: 'Pendidik (Porsi Besar)', value: 'PENDIDIK' },
        { label: 'PIC (Porsi Besar)', value: 'TENAGA_KEPENDIDIKAN' }
      ];
  }
};

const categoryLabelMap = {
  PAUD_TK: 'PAUD/TK (Porsi Kecil)',
  SD_1_3: 'Kelas 1-3 (Porsi Kecil)',
  SD_4_6: 'Kelas 4-6 (Porsi Besar)',
  SMP_1_3: 'Kelas 1-3 (Porsi Besar)',
  SMA_SMK_4_6: 'Kelas 4-6 (Porsi Besar)',
  PENDIDIK: 'Pendidik (Porsi Besar)',
  TENAGA_KEPENDIDIKAN: 'PIC (Porsi Besar)'
};

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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ flex: '0 0 auto' }}>
          <label style={{
            textTransform: 'uppercase',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.07em',
            color: 'var(--text-muted)',
            display: 'block',
            marginBottom: '6px'
          }}>
            Pilih Periode
          </label>
          <Dropdown
            style={{ width: '280px' }}
            value={selectedPeriodId}
            onChange={handlePeriodChange}
            options={periodeOptions}
            placeholder="-- Pilih Periode --"
          />
        </div>
      </div>

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
      {loading ? (
        <Skeleton count={5} height={40} />
      ) : (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflowX: 'auto',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow)',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            boxSizing: 'border-box'
          }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                <th style={{ padding: '12px 18px', textAlign: 'center', width: '50px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}></th>
                <th style={{ padding: '12px 18px', textAlign: 'center', width: '60px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>No</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>Nama</th>
                <th style={{ padding: '12px 18px', textAlign: 'center', width: '120px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>Jenjang</th>
                <th style={{ padding: '12px 18px', textAlign: 'center', width: '140px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>NPSN</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>Alamat</th>
                <th style={{ padding: '12px 18px', textAlign: 'center', width: '140px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sekolahList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    Belum ada data sekolah.
                  </td>
                </tr>
              ) : (
                sekolahList.map((row, idx) => {
                  const isExpanded = expandedSekolahId === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        style={{
                          backgroundColor: isExpanded ? 'rgba(7, 30, 73, 0.03)' : 'transparent',
                          transition: 'background-color var(--transition-fast)'
                        }}
                      >
                        <td style={{ padding: '16px 18px', textAlign: 'center', verticalAlign: 'middle', borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleExpand(row.id)}
                            title={isExpanded ? "Tutup Rincian Kelas" : "Lihat Rincian Kelas"}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              borderRadius: 'var(--radius-sm)'
                            }}
                          >
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </td>
                        <td style={{ padding: '16px 18px', textAlign: 'center', verticalAlign: 'middle', fontSize: 14, borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '16px 18px', textAlign: 'left', verticalAlign: 'middle', fontSize: 14, borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                          <strong style={{ color: 'var(--text)' }}>{row.nama}</strong>
                        </td>
                        <td style={{ padding: '16px 18px', textAlign: 'center', verticalAlign: 'middle', fontSize: 14, borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                          {row.jenjang}
                        </td>
                        <td style={{ padding: '16px 18px', textAlign: 'center', verticalAlign: 'middle', fontSize: 14, borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                          {row.npsn || '-'}
                        </td>
                        <td style={{ padding: '16px 18px', textAlign: 'left', verticalAlign: 'middle', fontSize: 14, borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                          {row.alamat || '-'}
                        </td>
                        <td style={{ padding: '16px 18px', textAlign: 'center', verticalAlign: 'middle', borderBottom: (isExpanded || idx < sekolahList.length - 1) ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEditModal(row)}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: 'var(--btn-secondary-bg, #e5e7eb)',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(row.id)}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--color-danger, #ef4444)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600
                              }}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-tabel Kelas saat row di-expand */}
                      {isExpanded && (
                        <tr key={`expand-row-${row.id}`}>
                          <td colSpan={7} style={{ padding: '16px 24px', backgroundColor: 'var(--bg)', borderBottom: idx < sekolahList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <div style={{
                              backgroundColor: 'var(--bg-elevated)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              padding: '16px 20px',
                              boxShadow: 'var(--shadow)'
                            }}>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '14px'
                              }}>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                                  Detail Kelas — {row.nama}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddKelasModal(row.id)}
                                  style={{
                                    padding: '8px 14px',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px'
                                  }}
                                >
                                  + Tambah Kelas
                                </button>
                              </div>

                              {kelasLoading && !kelasMap[row.id] ? (
                                <Skeleton count={3} height={36} />
                              ) : (
                                <table style={{
                                  width: '100%',
                                  borderCollapse: 'collapse',
                                  borderRadius: 'var(--radius-sm)',
                                  overflow: 'hidden',
                                  border: '1px solid var(--border)'
                                }}>
                                  <thead>
                                    <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                      <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textAlign: 'center', width: '60px', borderBottom: '1px solid var(--border)', color: 'var(--table-header-text)' }}>No</th>
                                      <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--table-header-text)' }}>Kategori Kelas</th>
                                      <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textAlign: 'right', width: '150px', borderBottom: '1px solid var(--border)', color: 'var(--table-header-text)' }}>Jumlah</th>
                                      <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, textAlign: 'center', width: '140px', borderBottom: '1px solid var(--border)', color: 'var(--table-header-text)' }}>Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(!kelasMap[row.id] || kelasMap[row.id].length === 0) ? (
                                      <tr>
                                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                          Belum ada data detail kelas untuk sekolah dan periode terpilih.
                                        </td>
                                      </tr>
                                    ) : (
                                      kelasMap[row.id].map((k, kIdx) => (
                                        <tr key={k.id} style={{ borderBottom: kIdx < kelasMap[row.id].length - 1 ? '1px solid var(--border)' : 'none' }}>
                                          <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '13px' }}>{kIdx + 1}</td>
                                          <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>{categoryLabelMap[k.namaKelas] || k.namaKelas}</td>
                                          <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '13px' }}>{k.jumlah} siswa</td>
                                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditKelasModal(k, row.id)}
                                                style={{
                                                  padding: '4px 10px',
                                                  backgroundColor: 'var(--btn-secondary-bg, #e5e7eb)',
                                                  color: 'var(--text)',
                                                  border: '1px solid var(--border)',
                                                  borderRadius: 'var(--radius-sm)',
                                                  cursor: 'pointer',
                                                  fontSize: '12px',
                                                  fontWeight: 600
                                                }}
                                              >
                                                Edit
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteKelasClick(k.id, row.id)}
                                                style={{
                                                  padding: '4px 10px',
                                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                  color: 'var(--color-danger, #ef4444)',
                                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                                  borderRadius: 'var(--radius-sm)',
                                                  cursor: 'pointer',
                                                  fontSize: '12px',
                                                  fontWeight: 600
                                                }}
                                              >
                                                Hapus
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form Tambah / Edit Sekolah */}
      {modalOpen && (
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
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            width: '90%',
            maxWidth: '480px',
            boxShadow: 'var(--shadow-hover)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text)'
            }}>
              {editingItem ? 'Edit Sekolah' : 'Tambah Sekolah Baru'}
            </h4>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Nama <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama sekolah"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Jenjang <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  required
                  value={formJenjang}
                  onChange={(e) => setFormJenjang(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Pilih Jenjang --</option>
                  {JENJANG_OPTIONS.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  NPSN
                </label>
                <input
                  type="text"
                  placeholder="8 digit angka"
                  maxLength={8}
                  value={formNpsn}
                  onChange={(e) => setFormNpsn(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Alamat
                </label>
                <textarea
                  rows={3}
                  placeholder="Alamat lengkap sekolah"
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--btn-cancel-bg, #f3f4f6)',
                    border: '1px solid var(--btn-cancel-border, #d1d5db)',
                    color: 'var(--btn-cancel-text, #374151)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Form Tambah / Edit Kelas */}
      {kelasModalOpen && (
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
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            width: '90%',
            maxWidth: '420px',
            boxShadow: 'var(--shadow-hover)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text)'
            }}>
              {editingKelas ? 'Edit Detail Kelas' : 'Tambah Kelas Baru'}
            </h4>

            <form onSubmit={handleSubmitKelasForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Kategori <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  required
                  value={formKelasNama}
                  onChange={(e) => setFormKelasNama(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Pilih Kategori --</option>
                  {getCategoryOptions(sekolahList.find(s => s.id === (targetSekolahId || expandedSekolahId))?.jenjang).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Jumlah <span style={{ color: 'red' }}>*</span>
                </label>
                <NumberInput
                  required
                  placeholder="Masukkan jumlah siswa"
                  value={formKelasJumlah === '' ? '' : Number(formKelasJumlah)}
                  onChange={(val) => setFormKelasJumlah(val)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setKelasModalOpen(false)}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--btn-cancel-bg, #f3f4f6)',
                    border: '1px solid var(--btn-cancel-border, #d1d5db)',
                    color: 'var(--btn-cancel-text, #374151)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
