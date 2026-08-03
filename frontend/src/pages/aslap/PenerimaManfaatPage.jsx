import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { categoryLabelMap, getKelasLabel, getDefaultKelas } from '../../components/aslap/penerimaManfaat/constants';
import { TopToolbar } from '../../components/aslap/penerimaManfaat/TopToolbar';
import { PenerimaForm } from '../../components/aslap/penerimaManfaat/PenerimaForm';
import { PenerimaListTable } from '../../components/aslap/penerimaManfaat/PenerimaListTable';

export const PenerimaManfaatPage = () => {
  const { request } = useApi();
  const toast = useToast();
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  // Master data
  const [periods, setPeriods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [schools, setSchools] = useState([]);
  const [posyandus, setPosyandus] = useState([]);

  // Selection / List / GrupHari
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [grupHariList, setGrupHariList] = useState([]);
  const [selectedGrupId, setSelectedGrupId] = useState('');
  const [items, setItems] = useState([]);

  // Form State
  const [editingId, setEditingId] = useState(null);
  
  // New Block Form State
  const [ats, setAts] = useState({
    ATS_KURANG_9TH: { lakiLaki: 0, perempuan: 0 },
    ATS_9_18TH: { lakiLaki: 0, perempuan: 0 }
  });
  const [formSchools, setFormSchools] = useState([]);
  const [formPosyandus, setFormPosyandus] = useState([]);
  const [newSchoolNpsn, setNewSchoolNpsn] = useState('');
  const [newSchoolAlamat, setNewSchoolAlamat] = useState('');

  // Kelas state & mapping
  const [schoolKelasMap, setSchoolKelasMap] = useState({});
  const [kelasLoading, setKelasLoading] = useState(false);

  // Deprecated: Fallback lama ke schoolCategoriesMap
  // const schoolCategoriesMap = {
  //   TK: ['PAUD_TK', 'PENDIDIK', 'TENAGA_KEPENDIDIKAN'],
  //   SD: ['SD_1_3', 'SD_4_6', 'PENDIDIK', 'TENAGA_KEPENDIDIKAN'],
  //   SMP: ['SMP_1_3', 'PENDIDIK', 'TENAGA_KEPENDIDIKAN'],
  //   SMA_SMK: ['SMA_SMK_4_6', 'PENDIDIK', 'TENAGA_KEPENDIDIKAN']
  // };
  // const getSchoolCategories = (jenjang) => {
  //   return schoolCategoriesMap[jenjang] || ['PENDIDIK', 'TENAGA_KEPENDIDIKAN'];
  // };

  // Load all master data on mount
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [resP, resK, resS, resY] = await Promise.all([
          request('/aslap/periode'),
          request('/aslap/kategori'),
          request('/aslap/sekolah'),
          request('/aslap/posyandu')
        ]);

        const dataP = await resP.json();
        const dataK = await resK.json();
        const dataS = await resS.json();
        const dataY = await resY.json();

        setPeriods(dataP);
        setCategories(dataK);
        setSchools(dataS);
        setPosyandus(dataY);

        if (dataP.length > 0) {
          setSelectedPeriodId(dataP[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error('Gagal memuat data master dari server.');
      }
    };
    loadMasterData();
  }, []);

  const fetchGrupHari = async (periodeId) => {
    if (!periodeId) return;
    try {
      const res = await request(`/aslap/grup-hari?periodeId=${periodeId}`);
      if (res.ok) {
        const data = await res.json();
        setGrupHariList(data);
        if (data.length > 0) {
          setSelectedGrupId(prev => (prev && data.some(g => g.id === prev) ? prev : data[0].id));
        } else {
          setSelectedGrupId('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchList = async (periodeId) => {
    if (!periodeId) return;
    try {
      const res = await request(`/aslap/penerima-manfaat?periodeId=${periodeId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil daftar penerima manfaat.');
    }
  };

  // Fetch list & GrupHari when selectedPeriodId changes
  useEffect(() => {
    if (!selectedPeriodId) return;
    fetchGrupHari(selectedPeriodId);
    fetchList(selectedPeriodId);
  }, [selectedPeriodId]);

  // Auto-populate global Posyandu from non-peserta row (grupHariId = null)
  useEffect(() => {
    const nonPesertaRow = items.find(item => item.grupHariId === null || item.grupHariId === undefined);
    if (nonPesertaRow) {
      const posyanduGroups = {};
      nonPesertaRow.detail.forEach(d => {
        const cat = d.kategori || categoriesById[d.kategoriId];
        const kode = cat?.kode;
        if (d.posyanduId || d.posyandu?.nama) {
          const key = d.posyanduId || `nama:${d.posyandu?.nama}`;
          if (!posyanduGroups[key]) {
            posyanduGroups[key] = {
              posyanduId: d.posyanduId || '',
              posyanduNama: d.posyanduId ? '' : (d.posyandu?.nama || ''),
              values: {}
            };
          }
          if (d.kategoriId) {
            posyanduGroups[key].values[d.kategoriId] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
          }
          if (kode) {
            posyanduGroups[key].values[kode] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
          }
        }
      });
      setFormPosyandus(Object.values(posyanduGroups));
    }
  }, [items]);

  // When selectedGrupId changes, populate Peserta Didik form for that group
  useEffect(() => {
    if (!selectedGrupId) {
      setEditingId(null);
      setAts({
        ATS_KURANG_9TH: { lakiLaki: 0, perempuan: 0 },
        ATS_9_18TH: { lakiLaki: 0, perempuan: 0 }
      });
      setFormSchools([]);
      return;
    }
    const existing = items.find(item => item.grupHariId === selectedGrupId);
    if (existing) {
      populateFormFromRow(existing);
    } else {
      setEditingId(null);
      setAts({
        ATS_KURANG_9TH: { lakiLaki: 0, perempuan: 0 },
        ATS_9_18TH: { lakiLaki: 0, perempuan: 0 }
      });
      setFormSchools([]);
    }
  }, [selectedGrupId, items]);

  // Helper mapping category code to category object
  const categoriesByKode = {};
  categories.forEach(c => { categoriesByKode[c.kode] = c; });
  const categoriesById = {};
  categories.forEach(c => { categoriesById[c.id] = c; });

  const resetForm = () => {
    setEditingId(null);
    setAts({
      ATS_KURANG_9TH: { lakiLaki: 0, perempuan: 0 },
      ATS_9_18TH: { lakiLaki: 0, perempuan: 0 }
    });
    setFormSchools([]);
    setFormPosyandus([]);
    setNewSchoolNpsn('');
    setNewSchoolAlamat('');
  };

  const populateFormFromRow = (row) => {
    setEditingId(row.id);

    if (row.grupHariId) {
      setSelectedGrupId(row.grupHariId);
    }

    const newAts = {
      ATS_KURANG_9TH: { lakiLaki: 0, perempuan: 0 },
      ATS_9_18TH: { lakiLaki: 0, perempuan: 0 }
    };
    const schoolGroups = {};
    const posyanduGroups = {};

    row.detail.forEach(d => {
      const cat = d.kategori || categoriesById[d.kategoriId];
      const kode = cat?.kode;

      if (kode && ['ATS_KURANG_9TH', 'ATS_9_18TH'].includes(kode)) {
        newAts[kode] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
      } else if (d.sekolahId || d.sekolah?.nama) {
        const key = d.sekolahId || `nama:${d.sekolah?.nama}`;
        if (!schoolGroups[key]) {
          schoolGroups[key] = {
            sekolahId: d.sekolahId || '',
            sekolahNama: d.sekolahId ? '' : (d.sekolah?.nama || ''),
            sekolahJenjang: d.sekolah?.jenjang || '',
            npsn: d.sekolah?.npsn || '',
            alamat: d.sekolah?.alamat || '',
            values: {}
          };
        }
        if (d.kategoriId) {
          schoolGroups[key].values[d.kategoriId] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
        }
        if (kode) {
          schoolGroups[key].values[kode] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
        }
        if (d.namaKelas) {
          schoolGroups[key].values[d.namaKelas] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
        }
        if (d.sekolahId) {
          fetchSekolahKelas(d.sekolahId);
        }
      } else if (d.posyanduId || d.posyandu?.nama) {
        const key = d.posyanduId || `nama:${d.posyandu?.nama}`;
        if (!posyanduGroups[key]) {
          posyanduGroups[key] = {
            posyanduId: d.posyanduId || '',
            posyanduNama: d.posyanduId ? '' : (d.posyandu?.nama || ''),
            values: {}
          };
        }
        if (d.kategoriId) {
          posyanduGroups[key].values[d.kategoriId] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
        }
        if (kode) {
          posyanduGroups[key].values[kode] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
        }
      }
    });

    if (row.grupHariId) {
      setAts(newAts);
      setFormSchools(Object.values(schoolGroups));
    } else {
      setFormPosyandus(Object.values(posyanduGroups));
    }

    const formElement = document.getElementById('penerima-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDeleteClick = async (id) => {
    setConfirmModal({
      open: true,
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus data ini?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await request(`/aslap/penerima-manfaat/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            toast.success('Data berhasil dihapus.');
            const listRes = await request(`/aslap/penerima-manfaat?periodeId=${selectedPeriodId}`);
            const data = await listRes.json();
            setItems(data);
          } else {
            const errData = await res.json();
            toast.error(errData.error || 'Gagal menghapus data.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Koneksi ke server gagal.');
        }
      }
    });
  };

  const handleDayCheckboxChange = (day) => {
    if (formHariAktif.includes(day)) {
      setFormHariAktif(formHariAktif.filter(d => d !== day));
    } else {
      setFormHariAktif([...formHariAktif, day]);
    }
  };

  // Fetch kelas detail for a school
  const fetchSekolahKelas = async (sekolahId, jenjangHint) => {
    if (!sekolahId || !selectedPeriodId) return [];

    if (sekolahId === 'NEW') {
      const defaultKelas = getDefaultKelas(jenjangHint || 'SD');
      setSchoolKelasMap(prev => ({ ...prev, NEW: defaultKelas }));
      return defaultKelas;
    }

    if (schoolKelasMap[sekolahId] && schoolKelasMap[sekolahId].length > 0) {
      return schoolKelasMap[sekolahId];
    }

    const selected = schools.find(s => s.id === sekolahId);
    const jenjang = jenjangHint || selected?.jenjang || 'SD';

    setKelasLoading(true);
    try {
      const res = await request(`/aslap/sekolah-kelas-detail?periodeId=${selectedPeriodId}&sekolahId=${sekolahId}`);
      if (res.ok) {
        const data = await res.json();
        const kelasList = Array.isArray(data) ? data : (data.kelas || data.detail || []);
        const finalKelasList = kelasList.length > 0 ? kelasList : getDefaultKelas(jenjang);

        setSchoolKelasMap(prev => ({ ...prev, [sekolahId]: finalKelasList }));
        return finalKelasList;
      }
    } catch (err) {
      console.error('Gagal fetch sekolah kelas detail:', err);
    } finally {
      setKelasLoading(false);
    }

    const fallbackKelas = getDefaultKelas(jenjang);
    setSchoolKelasMap(prev => ({ ...prev, [sekolahId]: fallbackKelas }));
    return fallbackKelas;
  };

  const handleSekolahChange = async (sekolahId, sIdx) => {
    const updated = [...formSchools];
    updated[sIdx] = { ...updated[sIdx], sekolahId };

    if (sekolahId && sekolahId !== 'NEW') {
      updated[sIdx].sekolahNama = '';
      updated[sIdx].npsn = '';
      updated[sIdx].alamat = '';
      const selected = schools.find(s => s.id === sekolahId);
      const jenjang = selected ? selected.jenjang : 'SD';
      if (selected) {
        updated[sIdx].sekolahJenjang = jenjang;
      }
      setFormSchools(updated);

      const kelasList = await fetchSekolahKelas(sekolahId, jenjang);

      setFormSchools(prev => {
        const next = [...prev];
        if (!next[sIdx]) return prev;
        const newValues = { ...next[sIdx].values };
        kelasList.forEach(k => {
          const key = k.kategoriId || k.id || k.namaKelas || k.kode;
          if (key && !newValues[key]) {
            newValues[key] = { lakiLaki: 0, perempuan: 0 };
          }
        });
        next[sIdx] = { ...next[sIdx], values: newValues };
        return next;
      });
    } else if (sekolahId === 'NEW') {
      const jenjang = updated[sIdx].sekolahJenjang || 'SD';
      updated[sIdx].sekolahJenjang = jenjang;

      const defaultKelas = getDefaultKelas(jenjang);
      setSchoolKelasMap(prev => ({ ...prev, NEW: defaultKelas }));

      const newValues = { ...updated[sIdx].values };
      defaultKelas.forEach(k => {
        const key = k.kategoriId || k.id || k.namaKelas || k.kode;
        if (key && !newValues[key]) {
          newValues[key] = { lakiLaki: 0, perempuan: 0 };
        }
      });
      updated[sIdx].values = newValues;
      setFormSchools(updated);
    } else {
      setFormSchools(updated);
    }
  };

  // School Block operations
  const addSchoolBlock = () => {
    setFormSchools([
      ...formSchools,
      {
        sekolahId: '',
        sekolahNama: '',
        sekolahJenjang: 'SD',
        npsn: '',
        alamat: '',
        values: {}
      }
    ]);
  };

  const removeSchoolBlock = (index) => {
    setFormSchools(formSchools.filter((_, idx) => idx !== index));
  };

  const handleSchoolBlockChange = (index, field, value) => {
    if (field === 'sekolahId') {
      handleSekolahChange(value, index);
      return;
    }
    const updated = [...formSchools];
    updated[index][field] = value;
    if (field === 'sekolahJenjang' && updated[index].sekolahId === 'NEW') {
      const defaultKelas = getDefaultKelas(value);
      setSchoolKelasMap(prev => ({ ...prev, NEW: defaultKelas }));
      const newValues = { ...updated[index].values };
      defaultKelas.forEach(k => {
        const key = k.kategoriId || k.id || k.namaKelas || k.kode;
        if (key && !newValues[key]) {
          newValues[key] = { lakiLaki: 0, perempuan: 0 };
        }
      });
      updated[index].values = newValues;
    }
    if (field === 'npsn') setNewSchoolNpsn(value);
    if (field === 'alamat') setNewSchoolAlamat(value);
    setFormSchools(updated);
  };

  const handleSchoolValueChange = (schoolIndex, categoryKode, gender, value) => {
    const updated = [...formSchools];
    if (!updated[schoolIndex].values[categoryKode]) {
      updated[schoolIndex].values[categoryKode] = { lakiLaki: 0, perempuan: 0 };
    }
    updated[schoolIndex].values[categoryKode][gender] = value === '' ? '' : (parseInt(value, 10) || 0);
    setFormSchools(updated);
  };

  // Posyandu Block operations
  const addPosyanduBlock = () => {
    setFormPosyandus([
      ...formPosyandus,
      {
        posyanduId: '',
        posyanduNama: '',
        values: {}
      }
    ]);
  };

  const removePosyanduBlock = (index) => {
    setFormPosyandus(formPosyandus.filter((_, idx) => idx !== index));
  };

  const handlePosyanduBlockChange = (index, field, value) => {
    const updated = [...formPosyandus];
    updated[index][field] = value;
    if (field === 'posyanduId' && value !== 'NEW') {
      updated[index].posyanduNama = '';
    }
    setFormPosyandus(updated);
  };

  const handlePosyanduValueChange = (posyanduIndex, categoryKode, gender, value) => {
    const updated = [...formPosyandus];
    if (!updated[posyanduIndex].values[categoryKode]) {
      updated[posyanduIndex].values[categoryKode] = { lakiLaki: 0, perempuan: 0 };
    }
    updated[posyanduIndex].values[categoryKode][gender] = value === '' ? '' : (parseInt(value, 10) || 0);
    setFormPosyandus(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // HTML5 Constraint validation
    const formElement = e.currentTarget;
    if (!formElement.checkValidity()) {
      const invalidElement = formElement.querySelector(':invalid');
      if (invalidElement) {
        invalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        invalidElement.focus();
      }
      return;
    }

    if (!selectedGrupId) {
      toast.error('Silakan buat dan pilih grup hari terlebih dahulu');
      setTimeout(() => {
        const el = document.getElementById('error-message-box');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    const pesertaDetail = [];
    const posyanduDetail = [];

    const addDetailItem = (targetArray, kode, l, p, schoolId, schoolNama, schoolJenjang, posyanduId, posyanduNama, npsn, alamat, namaKelas) => {
      const cat = categoriesByKode[kode];
      if (!cat) return;
      targetArray.push({
        kategoriId: cat.id,
        namaKelas: namaKelas || undefined,
        lakiLaki: parseInt(l, 10) || 0,
        perempuan: parseInt(p, 10) || 0,
        sekolahId: schoolId || undefined,
        sekolahNama: schoolNama || undefined,
        sekolahJenjang: schoolJenjang || undefined,
        posyanduId: posyanduId || undefined,
        posyanduNama: posyanduNama || undefined,
        npsn: npsn || undefined,
        alamat: alamat || undefined
      });
    };

    // 1. Flatten ATS (PESERTA_DIDIK)
    addDetailItem(pesertaDetail, 'ATS_KURANG_9TH', ats.ATS_KURANG_9TH.lakiLaki, ats.ATS_KURANG_9TH.perempuan);
    addDetailItem(pesertaDetail, 'ATS_9_18TH', ats.ATS_9_18TH.lakiLaki, ats.ATS_9_18TH.perempuan);

    // 2. Flatten Schools (PESERTA_DIDIK)
    for (let i = 0; i < formSchools.length; i++) {
      const block = formSchools[i];
      const sId = block.sekolahId;
      const sNama = block.sekolahNama;
      
      if (!sId) {
        toast.error(`Pilih sekolah pada Blok Sekolah #${i + 1}`);
        setTimeout(() => {
          const el = document.getElementById(`school-block-${i}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }
      if (sId === 'NEW' && !sNama.trim()) {
        toast.error(`Nama sekolah baru pada Blok Sekolah #${i + 1} tidak boleh kosong`);
        setTimeout(() => {
          const el = document.getElementById(`school-name-${i}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }

      const selectedS = schools.find(s => s.id === sId);
      const jenjang = selectedS ? selectedS.jenjang : block.sekolahJenjang;
      const kelasList = schoolKelasMap[sId] || getDefaultKelas(jenjang);

      kelasList.forEach(k => {
        const key = k.kategoriId || k.id || k.namaKelas || k.kode;
        const kode = k.kode || (k.kategoriId ? categoriesById[k.kategoriId]?.kode : null) || k.namaKelas;
        const katId = k.kategoriId || k.kategori?.id || (kode && categoriesByKode[kode] ? categoriesByKode[kode].id : k.id);
        const val = block.values[key] || block.values[k.kategoriId] || block.values[k.namaKelas] || block.values[k.kode] || { lakiLaki: 0, perempuan: 0 };
        const namaKelasVal = k.namaKelas || k.label;

        if (katId) {
          pesertaDetail.push({
            kategoriId: katId,
            namaKelas: namaKelasVal,
            lakiLaki: parseInt(val.lakiLaki, 10) || 0,
            perempuan: parseInt(val.perempuan, 10) || 0,
            sekolahId: sId === 'NEW' ? undefined : sId,
            sekolahNama: sId === 'NEW' ? sNama : undefined,
            sekolahJenjang: sId === 'NEW' ? jenjang : undefined,
            npsn: sId === 'NEW' ? (block.npsn || newSchoolNpsn || undefined) : undefined,
            alamat: sId === 'NEW' ? (block.alamat || newSchoolAlamat || undefined) : undefined
          });
        } else if (kode) {
          addDetailItem(
            pesertaDetail,
            kode,
            val.lakiLaki,
            val.perempuan,
            sId === 'NEW' ? undefined : sId,
            sId === 'NEW' ? sNama : undefined,
            jenjang,
            undefined,
            undefined,
            sId === 'NEW' ? (block.npsn || newSchoolNpsn || undefined) : undefined,
            sId === 'NEW' ? (block.alamat || newSchoolAlamat || undefined) : undefined,
            namaKelasVal
          );
        }
      });
    }

    // 3. Flatten Posyandus (NON_PESERTA_DIDIK)
    for (let i = 0; i < formPosyandus.length; i++) {
      const block = formPosyandus[i];
      const pId = block.posyanduId;
      const pNama = block.posyanduNama;

      if (!pId) {
        toast.error(`Pilih posyandu pada Blok Posyandu #${i + 1}`);
        setTimeout(() => {
          const el = document.getElementById(`posyandu-block-${i}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }
      if (pId === 'NEW' && !pNama.trim()) {
        toast.error(`Nama posyandu baru pada Blok Posyandu #${i + 1} tidak boleh kosong`);
        setTimeout(() => {
          const el = document.getElementById(`posyandu-name-${i}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }

      const codes = ['BUMIL', 'BUSUI', 'BALITA', 'KADER_POSYANDU'];
      codes.forEach(kode => {
        const val = block.values[kode] || { lakiLaki: 0, perempuan: 0 };
        addDetailItem(posyanduDetail, kode, val.lakiLaki, val.perempuan, undefined, undefined, undefined, pId === 'NEW' ? undefined : pId, pId === 'NEW' ? pNama : undefined);
      });
    }

    try {
      let isSuccess = false;

      // Submit Peserta Didik
      if (pesertaDetail.length > 0) {
        if (!selectedGrupId) {
          toast.error('Silakan buat dan pilih grup hari terlebih dahulu untuk data Peserta Didik');
          return;
        }

        const existingPeserta = items.find(item => item.grupHariId === selectedGrupId);
        const targetId = editingId && items.find(i => i.id === editingId)?.grupHariId ? editingId : existingPeserta?.id;
        const url = targetId ? `/aslap/penerima-manfaat/${targetId}` : '/aslap/penerima-manfaat';
        const method = targetId ? 'PUT' : 'POST';
        const payload = targetId
          ? { grupHariId: selectedGrupId, detail: pesertaDetail }
          : { periodeId: selectedPeriodId, grupHariId: selectedGrupId, detail: pesertaDetail };

        const resP = await request(url, { method, body: JSON.stringify(payload) });
        if (resP.ok) isSuccess = true;
      }

      // Submit Non-Peserta Didik (Posyandu) - dikirim tanpa grupHariId
      if (posyanduDetail.length > 0) {
        const existingNonPeserta = items.find(item => !item.grupHariId);
        const targetId = editingId && !items.find(i => i.id === editingId)?.grupHariId ? editingId : existingNonPeserta?.id;
        const url = targetId ? `/aslap/penerima-manfaat/${targetId}` : '/aslap/penerima-manfaat';
        const method = targetId ? 'PUT' : 'POST';
        const payload = { periodeId: selectedPeriodId, detail: posyanduDetail };

        const resNP = await request(url, { method, body: JSON.stringify(payload) });
        if (resNP.ok) isSuccess = true;
      }

      if (isSuccess) {
        toast.success(editingId ? 'Data berhasil diperbarui.' : 'Data berhasil ditambahkan.');
        resetForm();
        const listRes = await request(`/aslap/penerima-manfaat?periodeId=${selectedPeriodId}`);
        const listData = await listRes.json();
        setItems(listData);
      } else {
        toast.error('Terjadi kesalahan saat menyimpan data.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Koneksi ke server gagal.');
    }
  };

  const schoolOptions = [
    { value: '', label: '-- Pilih Sekolah --' },
    ...schools.map(s => ({ value: s.id, label: `${s.nama} (${s.jenjang})` })),
    { value: 'NEW', label: '-- Tambah Sekolah Baru --' }
  ];

  const posyanduOptions = [
    { value: '', label: '-- Pilih Posyandu --' },
    ...posyandus.map(y => ({ value: y.id, label: y.nama })),
    { value: 'NEW', label: '-- Tambah Posyandu Baru --' }
  ];

  return (
    <div>
      <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Pengelolaan Penerima Manfaat (Sekolah &amp; Posyandu)</h2>

      <TopToolbar
        periods={periods}
        selectedPeriodId={selectedPeriodId}
        setSelectedPeriodId={setSelectedPeriodId}
        resetForm={resetForm}
        grupHariList={grupHariList}
        fetchGrupHari={fetchGrupHari}
        fetchList={fetchList}
        selectedGrupId={selectedGrupId}
        setSelectedGrupId={setSelectedGrupId}
      />

      <PenerimaForm
        editingId={editingId}
        handleSubmit={handleSubmit}
        ats={ats}
        setAts={setAts}
        formSchools={formSchools}
        schools={schools}
        schoolOptions={schoolOptions}
        schoolKelasMap={schoolKelasMap}
        kelasLoading={kelasLoading}
        categoriesById={categoriesById}
        categoriesByKode={categoriesByKode}
        getDefaultKelas={getDefaultKelas}
        getKelasLabel={getKelasLabel}
        addSchoolBlock={addSchoolBlock}
        removeSchoolBlock={removeSchoolBlock}
        handleSchoolBlockChange={handleSchoolBlockChange}
        handleSchoolValueChange={handleSchoolValueChange}
        formPosyandus={formPosyandus}
        posyanduOptions={posyanduOptions}
        addPosyanduBlock={addPosyanduBlock}
        removePosyanduBlock={removePosyanduBlock}
        handlePosyanduBlockChange={handlePosyanduBlockChange}
        handlePosyanduValueChange={handlePosyanduValueChange}
        resetForm={resetForm}
      />

      <PenerimaListTable
        items={items}
        categoriesById={categoriesById}
        populateFormFromRow={populateFormFromRow}
        handleDeleteClick={handleDeleteClick}
      />

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
