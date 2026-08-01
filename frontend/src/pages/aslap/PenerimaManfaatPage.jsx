import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { GrupHariManager } from '../../components/GrupHariManager';

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

  const categoryLabelMap = {
    SD_1_3: 'Kelas 1-3',
    SD_4_6: 'Kelas 4-6',
    SMP_1_3: 'Kelas 1-3',
    SMA_SMK_4_6: 'Kelas 4-6',
    PAUD_TK: 'PAUD / TK',
    PENDIDIK: 'Pendidik',
    TENAGA_KEPENDIDIKAN: 'PIC',
    ATS_KURANG_9TH: 'ATS < 9 Tahun',
    ATS_9_18TH: 'ATS 9-18 Tahun',
    BUMIL: 'Ibu Hamil',
    BUSUI: 'Ibu Menyusui',
    BALITA: 'Balita',
    KADER_POSYANDU: 'Kader Posyandu'
  };

  const getKelasLabel = (namaKelas, fallbackNama) => {
    if (namaKelas && categoryLabelMap[namaKelas]) {
      return categoryLabelMap[namaKelas];
    }
    return fallbackNama || namaKelas || '';
  };

  const getDefaultKelas = (jenjang) => {
    switch (jenjang) {
      case 'TK':
        return [
          { namaKelas: 'PAUD/TK', label: 'PAUD/TK', kode: 'PAUD_TK' },
          { namaKelas: 'Pendidik', label: 'Pendidik', kode: 'PENDIDIK' },
          { namaKelas: 'PIC', label: 'PIC', kode: 'TENAGA_KEPENDIDIKAN' }
        ];
      case 'SD':
        return [
          { namaKelas: 'Kelas 1', label: 'Kelas 1', kode: 'SD_1_3' },
          { namaKelas: 'Kelas 2', label: 'Kelas 2', kode: 'SD_1_3' },
          { namaKelas: 'Kelas 3', label: 'Kelas 3', kode: 'SD_1_3' },
          { namaKelas: 'Kelas 4', label: 'Kelas 4', kode: 'SD_4_6' },
          { namaKelas: 'Kelas 5', label: 'Kelas 5', kode: 'SD_4_6' },
          { namaKelas: 'Kelas 6', label: 'Kelas 6', kode: 'SD_4_6' },
          { namaKelas: 'Pendidik', label: 'Pendidik', kode: 'PENDIDIK' },
          { namaKelas: 'PIC', label: 'PIC', kode: 'TENAGA_KEPENDIDIKAN' }
        ];
      case 'SMP':
        return [
          { namaKelas: 'Kelas 1', label: 'Kelas 1', kode: 'SMP_1_3' },
          { namaKelas: 'Kelas 2', label: 'Kelas 2', kode: 'SMP_1_3' },
          { namaKelas: 'Kelas 3', label: 'Kelas 3', kode: 'SMP_1_3' },
          { namaKelas: 'Pendidik', label: 'Pendidik', kode: 'PENDIDIK' },
          { namaKelas: 'PIC', label: 'PIC', kode: 'TENAGA_KEPENDIDIKAN' }
        ];
      case 'SMA_SMK':
        return [
          { namaKelas: 'Kelas 4', label: 'Kelas 4', kode: 'SMA_SMK_4_6' },
          { namaKelas: 'Kelas 5', label: 'Kelas 5', kode: 'SMA_SMK_4_6' },
          { namaKelas: 'Kelas 6', label: 'Kelas 6', kode: 'SMA_SMK_4_6' },
          { namaKelas: 'Pendidik', label: 'Pendidik', kode: 'PENDIDIK' },
          { namaKelas: 'PIC', label: 'PIC', kode: 'TENAGA_KEPENDIDIKAN' }
        ];
      default:
        return [
          { namaKelas: 'Pendidik', label: 'Pendidik', kode: 'PENDIDIK' },
          { namaKelas: 'PIC', label: 'PIC', kode: 'TENAGA_KEPENDIDIKAN' }
        ];
    }
  };

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

  const jenjangOptions = [
    { value: 'TK', label: 'TK/PAUD' },
    { value: 'SD', label: 'SD' },
    { value: 'SMP', label: 'SMP' },
    { value: 'SMA_SMK', label: 'SMA/SMK' }
  ];

  const posyanduOptions = [
    { value: '', label: '-- Pilih Posyandu --' },
    ...posyandus.map(y => ({ value: y.id, label: y.nama })),
    { value: 'NEW', label: '-- Tambah Posyandu Baru --' }
  ];

  return (
    <div>
      <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Pengelolaan Penerima Manfaat (Sekolah &amp; Posyandu)</h2>

      {/* Messages */}
      {/* Top Row: Period Selection + GrupHariManager */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        {/* Period Selection */}
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow)',
          flex: '0 0 auto',
          width: '26%',
          minWidth: '280px'
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
            value={selectedPeriodId}
            onChange={(val) => {
              setSelectedPeriodId(val);
              resetForm();
            }}
            options={periods.map(p => ({
              value: p.id,
              label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
            }))}
          />
        </div>

        {/* GrupHariManager */}
        <div style={{
          flex: 1,
          minWidth: '400px'
        }}>
          <GrupHariManager
            periodeId={selectedPeriodId}
            grupHariList={grupHariList}
            onRefresh={() => {
              fetchGrupHari(selectedPeriodId);
              fetchList(selectedPeriodId);
            }}
            selectedGrupId={selectedGrupId}
            onSelectGrup={(gId) => setSelectedGrupId(gId)}
          />
        </div>
      </div>

      {/* Create / Edit Form */}
      <form id="penerima-form" onSubmit={handleSubmit} style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          {editingId ? 'Edit Data Penerima' : 'Tambah Data Baru'}
        </h3>

        {/* SECTION 1: FIXED ATS SECTION */}
        <div className="ui-card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Anak Tidak Sekolah (ATS)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* ATS < 9 Tahun */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '12px' }}>
              <div style={{ flex: '1 1 250px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Anak Tidak Sekolah Usia &lt; 9 Tahun</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Kategori: ATS_KURANG_9TH (Porsi Kecil)</div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Laki-laki</label>
                  <NumberInput
                    required
                    className="form-field"
                    style={{ width: '100px' }}
                    value={ats.ATS_KURANG_9TH.lakiLaki === '' ? '' : Number(ats.ATS_KURANG_9TH.lakiLaki)}
                    onChange={(val) => setAts({
                      ...ats,
                      ATS_KURANG_9TH: { ...ats.ATS_KURANG_9TH, lakiLaki: val }
                    })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Perempuan</label>
                  <NumberInput
                    required
                    className="form-field"
                    style={{ width: '100px' }}
                    value={ats.ATS_KURANG_9TH.perempuan === '' ? '' : Number(ats.ATS_KURANG_9TH.perempuan)}
                    onChange={(val) => setAts({
                      ...ats,
                      ATS_KURANG_9TH: { ...ats.ATS_KURANG_9TH, perempuan: val }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* ATS 9-18 Tahun */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
              <div style={{ flex: '1 1 250px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Anak Tidak Sekolah Usia 9 - 18 Tahun</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Kategori: ATS_9_18TH (Porsi Besar)</div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Laki-laki</label>
                  <NumberInput
                    required
                    className="form-field"
                    style={{ width: '100px' }}
                    value={ats.ATS_9_18TH.lakiLaki === '' ? '' : Number(ats.ATS_9_18TH.lakiLaki)}
                    onChange={(val) => setAts({
                      ...ats,
                      ATS_9_18TH: { ...ats.ATS_9_18TH, lakiLaki: val }
                    })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Perempuan</label>
                  <NumberInput
                    required
                    className="form-field"
                    style={{ width: '100px' }}
                    value={ats.ATS_9_18TH.perempuan === '' ? '' : Number(ats.ATS_9_18TH.perempuan)}
                    onChange={(val) => setAts({
                      ...ats,
                      ATS_9_18TH: { ...ats.ATS_9_18TH, perempuan: val }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: SCHOOL BLOCKS */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: '0', color: 'var(--text)', fontSize: '16px', fontWeight: 700 }}>
              Rincian Sekolah Terdaftar
            </h4>
            <button
              type="button"
              onClick={addSchoolBlock}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              + Tambah Sekolah
            </button>
          </div>

          {formSchools.map((block, sIdx) => {
            const selectedS = schools.find(s => s.id === block.sekolahId);
            const jenjang = selectedS ? selectedS.jenjang : block.sekolahJenjang;
            // HAPUS/COMMENT: const categoryKodes = getSchoolCategories(jenjang);
            const kelasList = schoolKelasMap[block.sekolahId] || getDefaultKelas(jenjang);

            return (
              <div
                key={sIdx}
                id={`school-block-${sIdx}`}
                className="ui-card"
                style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--border)', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <h5 style={{ margin: '0', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Blok Sekolah #{sIdx + 1}
                  </h5>
                  <button
                    type="button"
                    onClick={() => removeSchoolBlock(sIdx)}
                    style={{ color: 'var(--color-danger)', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 600, fontSize: '13px' }}
                  >
                    Hapus
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <div style={{ flex: '1 1 250px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Pilih Sekolah
                    </label>
                    <Dropdown
                      style={{ width: '100%' }}
                      value={block.sekolahId}
                      onChange={(val) => handleSchoolBlockChange(sIdx, 'sekolahId', val)}
                      options={schoolOptions}
                    />
                  </div>

                  {block.sekolahId === 'NEW' && (
                    <>
                      <div style={{ flex: '2 1 250px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                          Nama Sekolah Baru *
                        </label>
                        <input
                          id={`school-name-${sIdx}`}
                          type="text"
                          required
                          className="form-field"
                          placeholder="Masukkan nama sekolah..."
                          value={block.sekolahNama}
                          onChange={(e) => handleSchoolBlockChange(sIdx, 'sekolahNama', e.target.value)}
                        />
                      </div>
                      <div style={{ flex: '1 1 150px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                          Jenjang *
                        </label>
                        <Dropdown
                          style={{ width: '100%' }}
                          value={block.sekolahJenjang}
                          onChange={(val) => handleSchoolBlockChange(sIdx, 'sekolahJenjang', val)}
                          options={jenjangOptions}
                        />
                      </div>
                      <div style={{ flex: '1 1 180px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                          NPSN
                        </label>
                        <input
                          type="text"
                          className="form-field"
                          placeholder="8 digit angka"
                          maxLength={8}
                          value={block.npsn || ''}
                          onChange={(e) => handleSchoolBlockChange(sIdx, 'npsn', e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                      <div style={{ flex: '100%' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                          Alamat
                        </label>
                        <textarea
                          rows={2}
                          className="form-field"
                          placeholder="Alamat sekolah"
                          value={block.alamat || ''}
                          onChange={(e) => handleSchoolBlockChange(sIdx, 'alamat', e.target.value)}
                          style={{ width: '100%', resize: 'vertical' }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Render inputs based on schoolKelasMap */}
                {(block.sekolahId || block.sekolahNama) && (
                  <div style={{ backgroundColor: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Rincian Sasaran Per Kelas {jenjang ? `(${jenjang})` : ''}
                    </div>
                    {kelasLoading && block.sekolahId && block.sekolahId !== 'NEW' && !schoolKelasMap[block.sekolahId] && (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '10px 0' }}>Memuat detail kelas...</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {kelasList.map(k => {
                        const key = k.kategoriId || k.id || k.namaKelas || k.kode;
                        const cat = k.kategori || (k.kategoriId ? categoriesById[k.kategoriId] : (categoriesByKode[k.kode] || categoriesByKode[k.namaKelas]));
                        const label = k.label || k.namaKelas || getKelasLabel(k.kode || cat?.kode || k.namaKelas, cat?.nama || k.namaKelas || k.nama);
                        const val = block.values[key] || block.values[k.kategoriId] || block.values[k.namaKelas] || block.values[k.kode] || { lakiLaki: 0, perempuan: 0 };

                        return (
                          <div key={key || k.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <div style={{ flex: '1 1 200px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{label}</span>
                              {cat?.jenisPorsi && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({cat.jenisPorsi === 'KECIL' ? 'Porsi Kecil' : 'Porsi Besar'})</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>L:</span>
                                <NumberInput
                                  required
                                  className="form-field"
                                  style={{ width: '80px', padding: '6px 8px' }}
                                  value={val.lakiLaki === '' ? '' : Number(val.lakiLaki)}
                                  onChange={(valInput) => handleSchoolValueChange(sIdx, key, 'lakiLaki', valInput)}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>P:</span>
                                <NumberInput
                                  required
                                  className="form-field"
                                  style={{ width: '80px', padding: '6px 8px' }}
                                  value={val.perempuan === '' ? '' : Number(val.perempuan)}
                                  onChange={(valInput) => handleSchoolValueChange(sIdx, key, 'perempuan', valInput)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* SECTION 3: POSYANDU BLOCKS */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: '0', color: 'var(--text)', fontSize: '16px', fontWeight: 700 }}>
              Rincian Posyandu / Non-Siswa
            </h4>
            <button
              type="button"
              onClick={addPosyanduBlock}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              + Tambah Posyandu
            </button>
          </div>

          {formPosyandus.map((block, pIdx) => {
            const posyanduKodes = ['BUMIL', 'BUSUI', 'BALITA', 'KADER_POSYANDU'];

            return (
              <div
                key={pIdx}
                id={`posyandu-block-${pIdx}`}
                className="ui-card"
                style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--border)', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <h5 style={{ margin: '0', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Blok Posyandu #{pIdx + 1}
                  </h5>
                  <button
                    type="button"
                    onClick={() => removePosyanduBlock(pIdx)}
                    style={{ color: 'var(--color-danger)', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 600, fontSize: '13px' }}
                  >
                    Hapus
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <div style={{ flex: '1 1 250px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Pilih Posyandu
                    </label>
                    <Dropdown
                      style={{ width: '100%' }}
                      value={block.posyanduId}
                      onChange={(val) => handlePosyanduBlockChange(pIdx, 'posyanduId', val)}
                      options={posyanduOptions}
                    />
                  </div>

                  {block.posyanduId === 'NEW' && (
                    <div style={{ flex: '2 1 250px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Nama Posyandu Baru
                      </label>
                      <input
                        id={`posyandu-name-${pIdx}`}
                        type="text"
                        required
                        className="form-field"
                        placeholder="Masukkan nama posyandu..."
                        value={block.posyanduNama}
                        onChange={(e) => handlePosyanduBlockChange(pIdx, 'posyanduNama', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Render fixed posyandu inputs */}
                {(block.posyanduId || block.posyanduNama) && (
                  <div style={{ backgroundColor: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Rincian Sasaran Posyandu
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {posyanduKodes.map(kode => {
                        const cat = categoriesByKode[kode];
                        if (!cat) return null;
                        const val = block.values[kode] || { lakiLaki: 0, perempuan: 0 };

                        return (
                          <div key={kode} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <div style={{ flex: '1 1 200px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{cat.nama}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({cat.jenisPorsi === 'KECIL' ? 'Porsi Kecil' : 'Porsi Besar'})</span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>L:</span>
                                <NumberInput
                                  required
                                  className="form-field"
                                  style={{ width: '80px', padding: '6px 8px' }}
                                  value={val.lakiLaki === '' ? '' : Number(val.lakiLaki)}
                                  onChange={(valInput) => handlePosyanduValueChange(pIdx, kode, 'lakiLaki', valInput)}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>P:</span>
                                <NumberInput
                                  required
                                  className="form-field"
                                  style={{ width: '80px', padding: '6px 8px' }}
                                  value={val.perempuan === '' ? '' : Number(val.perempuan)}
                                  onChange={(valInput) => handlePosyanduValueChange(pIdx, kode, 'perempuan', valInput)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <button type="submit" style={{
            padding: '10px 20px',
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px'
          }}>
            {editingId ? 'Simpan Perubahan' : 'Kirim / Simpan Data'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} style={{
              padding: '10px 20px',
              backgroundColor: 'var(--btn-cancel-bg)',
              border: '1px solid var(--btn-cancel-border)',
              color: 'var(--btn-cancel-text)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}>
              Batal Edit
            </button>
          )}
        </div>
      </form>

      {/* List / Table */}
      <Table
        columns={[
          {
            key: 'grupHari',
            header: 'Grup Hari',
            width: '180px',
            render: (val, row) => (
              <div>
                <strong style={{ color: 'var(--text)', display: 'block' }}>
                  {val?.label || 'Grup Custom'}
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {(val?.hariAktif || row.hariAktif || []).join(', ')}
                </span>
              </div>
            )
          },
          {
            key: 'createdBy',
            header: 'Pembuat',
            render: (val) => val?.nama || 'System'
          },
          {
            key: 'detail',
            header: 'Rincian Detail Penerima (Sasaran & Jumlah)',
            render: (val) => {
              if (!val || !Array.isArray(val)) return '-';

              const atsItems = [];
              const schoolMap = {};
              const posyanduMap = {};

              let grandL = 0;
              let grandP = 0;
              let grandPIC = 0;

              val.forEach(d => {
                const cat = d.kategori || categoriesById[d.kategoriId];
                const kode = cat?.kode;
                const l = Number(d.lakiLaki) || 0;
                const p = Number(d.perempuan) || 0;

                grandL += l;
                grandP += p;

                const isPic = kode === 'PENDIDIK' || kode === 'TENAGA_KEPENDIDIKAN' || d.namaKelas === 'Pendidik' || d.namaKelas === 'PIC' || d.namaKelas === 'TENAGA_KEPENDIDIKAN';
                if (isPic) {
                  grandPIC += (l + p);
                }

                const sNama = d.sekolah?.nama || d.sekolahNama;
                const pNama = d.posyandu?.nama || d.posyanduNama;

                if (['ATS_KURANG_9TH', 'ATS_9_18TH'].includes(kode)) {
                  atsItems.push(d);
                } else if (sNama) {
                  if (!schoolMap[sNama]) schoolMap[sNama] = [];
                  schoolMap[sNama].push(d);
                } else if (pNama) {
                  if (!posyanduMap[pNama]) posyanduMap[pNama] = [];
                  posyanduMap[pNama].push(d);
                }
              });

              const grandTotal = grandL + grandP;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  {atsItems.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>[ATS]: </span>
                      {atsItems.map((d, i) => (
                        <span key={d.id || i} style={{ marginRight: '10px' }}>
                          {d.kategori?.nama || categoriesById[d.kategoriId]?.nama} (L:{d.lakiLaki}, P:{d.perempuan})
                        </span>
                      ))}
                    </div>
                  )}

                  {Object.entries(schoolMap).map(([name, list]) => {
                    let schoolL = 0;
                    let schoolP = 0;
                    let schoolPIC = 0;

                    list.forEach(d => {
                      const cat = d.kategori || categoriesById[d.kategoriId];
                      const kode = cat?.kode;
                      const l = Number(d.lakiLaki) || 0;
                      const p = Number(d.perempuan) || 0;
                      schoolL += l;
                      schoolP += p;

                      const isPic = kode === 'PENDIDIK' || kode === 'TENAGA_KEPENDIDIKAN' || d.namaKelas === 'Pendidik' || d.namaKelas === 'PIC' || d.namaKelas === 'TENAGA_KEPENDIDIKAN';
                      if (isPic) {
                        schoolPIC += (l + p);
                      }
                    });

                    const schoolGrand = schoolL + schoolP;

                    return (
                      <div key={name} style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '6px' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{name}: </span>
                          {list.map((d, i) => {
                            const catNama = d.kategori?.nama || categoriesById[d.kategoriId]?.nama;
                            const label = d.namaKelas || d.label || getKelasLabel(d.kategori?.kode, catNama);
                            return (
                              <span key={d.id || i} style={{ marginRight: '10px' }}>
                                {label || catNama} (L:{d.lakiLaki}, P:{d.perempuan})
                              </span>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: '4px', fontWeight: 700, fontSize: '12px' }}>
                          <span>TOTAL {name}: </span>
                          L: <strong style={{ color: 'var(--color-primary)' }}>{schoolL}</strong> | P: <strong style={{ color: 'var(--color-primary)' }}>{schoolP}</strong> | PIC: <strong style={{ color: 'var(--color-primary)' }}>{schoolPIC}</strong> | Grand: <strong style={{ color: 'var(--color-primary)' }}>{schoolGrand}</strong>
                        </div>
                      </div>
                    );
                  })}

                  {Object.entries(posyanduMap).map(([name, list]) => {
                    let posyanduL = 0;
                    let posyanduP = 0;

                    list.forEach(d => {
                      const l = Number(d.lakiLaki) || 0;
                      const p = Number(d.perempuan) || 0;
                      posyanduL += l;
                      posyanduP += p;
                    });

                    const posyanduGrand = posyanduL + posyanduP;

                    return (
                      <div key={name} style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '6px' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{name}: </span>
                          {list.map((d, i) => (
                            <span key={d.id || i} style={{ marginRight: '10px' }}>
                              {getKelasLabel(d.kategori?.kode, d.kategori?.nama || categoriesById[d.kategoriId]?.nama)} (L:{d.lakiLaki}, P:{d.perempuan})
                            </span>
                          ))}
                        </div>
                        <div style={{ marginTop: '4px', fontWeight: 700, fontSize: '12px' }}>
                          <span>TOTAL {name}: </span>
                          L: <strong style={{ color: 'var(--color-primary)' }}>{posyanduL}</strong> | P: <strong style={{ color: 'var(--color-primary)' }}>{posyanduP}</strong> | Grand: <strong style={{ color: 'var(--color-primary)' }}>{posyanduGrand}</strong>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--border)', fontWeight: 700, fontSize: '12px' }}>
                    <span>GRAND TOTAL: </span>
                    L: <strong style={{ color: 'var(--color-primary)' }}>{grandL}</strong> | P: <strong style={{ color: 'var(--color-primary)' }}>{grandP}</strong> | PIC: <strong style={{ color: 'var(--color-primary)' }}>{grandPIC}</strong> | Grand: <strong style={{ color: 'var(--color-primary)' }}>{grandTotal}</strong>
                  </div>
                </div>
              );
            }
          },
          {
            key: 'id',
            header: 'Aksi',
            align: 'center',
            width: '130px',
            render: (val, row) => (
              <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                <button onClick={() => populateFormFromRow(row)} style={{ padding: '3px 8px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDeleteClick(val)} style={{ padding: '3px 8px', color: 'red', cursor: 'pointer' }}>Hapus</button>
              </div>
            )
          }
        ]}
        data={items}
        emptyText="Belum ada data penerima manfaat untuk periode ini."
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
