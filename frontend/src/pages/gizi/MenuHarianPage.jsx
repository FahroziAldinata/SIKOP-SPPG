// frontend/src/pages/gizi/MenuHarianPage.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import Dropdown from '../../components/Dropdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Table, renderDate } from '../../components/Table';
import {
    fieldLabel,
    buttonStyle,
    formatDate,
    getTanggalMusnah,
    getBahanName,
    getBahanLabel
} from '../../components/gizi/menuHarian/helpers';
import { MenuHarianWorkspace } from '../../components/gizi/menuHarian/MenuHarianWorkspace';
import { MasterMenuSetup } from '../../components/gizi/menuHarian/MasterMenuSetup';
import { MenuHarianForm } from '../../components/gizi/menuHarian/MenuHarianForm';
import { RiwayatMenu } from '../../components/gizi/menuHarian/RiwayatMenu';

export const MenuHarianPage = () => {
    const { request } = useApi();
    const toast = useToast();

    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [items, setItems] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingMenuId, setPendingMenuId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
    const [tanggal, setTanggal] = useState('');
    const [error, setError] = useState('');

    const [kelompokUmur, setKelompokUmur] = useState([]);
    const [selectedKelompokUmurId, setSelectedKelompokUmurId] = useState('');
    const [menuItemsByBlok, setMenuItemsByBlok] = useState({});
    const [namaMenuInput, setNamaMenuInput] = useState({});
    const [komponenInput, setKomponenInput] = useState({});
    const [bahanPokokList, setBahanPokokList] = useState([]);
    const [bahanByMenuItem, setBahanByMenuItem] = useState({});
    const [bahanForm, setBahanForm] = useState({});
    const [organoleptikByBlok, setOrganoleptikByBlok] = useState({});
    const [organoleptikForm, setOrganoleptikForm] = useState({});
    const [alergiByBlok, setAlergiByBlok] = useState({});
    const [alergiForm, setAlergiForm] = useState({});
    const [targetGiziByBlok, setTargetGiziByBlok] = useState({});

    const [kendaraanList, setKendaraanList] = useState([]);
    const [pengirimanByMenu, setPengirimanByMenu] = useState({});
    const [pengirimanForm, setPengirimanForm] = useState({});
    const [kategoriList, setKategoriList] = useState([]);
    const [masterMenuList, setMasterMenuList] = useState([]);
    const [actualMasterMenuList, setActualMasterMenuList] = useState([]);
    const [showMasterModal, setShowMasterModal] = useState(false);
    const [masterForm, setMasterForm] = useState({
        id: '',
        jalur: 'SISWA',
        hari: 'SENIN',
        mingguKe: 1,
        catatan: '',
        menuKarbohidrat: '',
        menuLaukHewani: '',
        menuLaukNabati: '',
        menuSayur: '',
        menuBuah: ''
    });

    const getMingguKeFromDate = (targetDateStr, startDateStr) => {
        if (!startDateStr || !targetDateStr) return 1;
        const start = new Date(startDateStr.split('T')[0]);
        const target = new Date(targetDateStr.split('T')[0]);
        const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
        if (isNaN(diffDays) || diffDays < 0) return 1;
        return (Math.floor(diffDays / 7) % 2) + 1;
    };

    const loadActualMasterMenu = (pid) => {
        if (!pid) return;
        request(`/gizi/master-menu-list?periodeId=${pid}`)
            .then(r => r.ok ? r.json() : { success: false })
            .then(d => {
                if (d && d.success) {
                    setActualMasterMenuList(d.data || []);
                }
            })
            .catch(() => {});
    };

    const fetchMasterByHari = async (jalur, hari, mingguKe = 1) => {
        if (!periodeId) return;
        try {
            const r = await request(`/gizi/master-menu/by-hari?periodeId=${periodeId}&jalur=${jalur}&hari=${hari}&mingguKe=${mingguKe}`);
            if (r.ok) {
                const data = await r.json();
                if (data) {
                    setMasterForm({
                        id: data.id,
                        jalur: data.jalur,
                        hari: data.hari,
                        mingguKe: data.mingguKe || 1,
                        catatan: data.catatan || '',
                        menuKarbohidrat: data.menuKarbohidrat || '',
                        menuLaukHewani: data.menuLaukHewani || '',
                        menuLaukNabati: data.menuLaukNabati || '',
                        menuSayur: data.menuSayur || '',
                        menuBuah: data.menuBuah || ''
                    });
                } else {
                    setMasterForm(prev => ({
                        id: '',
                        jalur: prev.jalur,
                        hari: prev.hari,
                        mingguKe: prev.mingguKe,
                        catatan: '',
                        menuKarbohidrat: '',
                        menuLaukHewani: '',
                        menuLaukNabati: '',
                        menuSayur: '',
                        menuBuah: ''
                    }));
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const submitMasterMenu = async (e) => {
        e.preventDefault();
        if (!periodeId) {
            toast.error('Periode belum dipilih.');
            return;
        }

        const payload = {
            periodeId,
            jalur: masterForm.jalur,
            hari: masterForm.hari,
            mingguKe: Number(masterForm.mingguKe) || 1,
            catatan: masterForm.catatan,
            menuKarbohidrat: masterForm.menuKarbohidrat,
            menuLaukHewani: masterForm.menuLaukHewani,
            menuLaukNabati: masterForm.menuLaukNabati,
            menuSayur: masterForm.menuSayur,
            menuBuah: masterForm.menuBuah
        };

        if (masterForm.id) {
            try {
                const r = await request(`/gizi/master-menu/${masterForm.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                const d = await r.json();
                if (r.ok) {
                    toast.success('Master Menu berhasil diperbarui.');
                    request(`/gizi/master-menu?periodeId=${periodeId}`)
                        .then(res => res.ok ? res.json() : [])
                        .then(d => setMasterMenuList(d));
                    loadActualMasterMenu(periodeId);
                    setShowMasterModal(false);
                } else {
                    toast.error(d.error || 'Gagal memperbarui master menu.');
                }
            } catch (err) {
                toast.error(err.message || 'Terjadi kesalahan koneksi');
            }
        } else {
            try {
                const r = await request('/gizi/master-menu', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                const d = await r.json();
                if (r.ok) {
                    toast.success('Master Menu berhasil disimpan.');
                    request(`/gizi/master-menu?periodeId=${periodeId}`)
                        .then(res => res.ok ? res.json() : [])
                        .then(d => setMasterMenuList(d));
                    loadActualMasterMenu(periodeId);
                    setShowMasterModal(false);
                } else if (r.status === 400 || r.status === 409) {
                    toast.info('Master menu sudah ada. Memuat data untuk diedit...');
                    const getRes = await request(`/gizi/master-menu/by-hari?periodeId=${periodeId}&jalur=${masterForm.jalur}&hari=${masterForm.hari}&mingguKe=${masterForm.mingguKe}`);
                    if (getRes.ok) {
                        const existingData = await getRes.json();
                        if (existingData) {
                            setMasterForm({
                                id: existingData.id,
                                jalur: existingData.jalur,
                                hari: existingData.hari,
                                mingguKe: existingData.mingguKe || 1,
                                catatan: existingData.catatan || '',
                                menuKarbohidrat: existingData.menuKarbohidrat || '',
                                menuLaukHewani: existingData.menuLaukHewani || '',
                                menuLaukNabati: existingData.menuLaukNabati || '',
                                menuSayur: existingData.menuSayur || '',
                                menuBuah: existingData.menuBuah || ''
                            });
                        }
                    }
                } else {
                    toast.error(d.error || 'Gagal menyimpan master menu.');
                }
            } catch (err) {
                toast.error(err.message || 'Terjadi kesalahan koneksi');
            }
        }
    };

    const deleteMasterMenu = async (id) => {
        if (!id) return;
        setConfirmModal({
            open: true,
            title: 'Konfirmasi Hapus',
            message: 'Apakah Anda yakin ingin menghapus master menu ini?',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, open: false }));
                try {
                    const r = await request(`/gizi/master-menu/${id}`, { method: 'DELETE' });
                    if (r.ok) {
                        toast.success('Master Menu berhasil dihapus.');
                        setMasterForm(prev => ({
                            id: '',
                            jalur: prev.jalur,
                            hari: prev.hari,
                            mingguKe: prev.mingguKe,
                            catatan: '',
                            menuKarbohidrat: '',
                            menuLaukHewani: '',
                            menuLaukNabati: '',
                            menuSayur: '',
                            menuBuah: ''
                        }));
                        request(`/gizi/master-menu?periodeId=${periodeId}`)
                            .then(res => res.ok ? res.json() : [])
                            .then(d => setMasterMenuList(d));
                        loadActualMasterMenu(periodeId);
                        setShowMasterModal(false);
                    } else {
                        const d = await r.json();
                        toast.error(d.error || 'Gagal menghapus master menu.');
                    }
                } catch (err) {
                    toast.error(err.message || 'Terjadi kesalahan koneksi');
                }
            }
        });
    };

    const applyMasterMenu = async (blok, menu) => {
        setError('');
        const datePart = menu.tanggal.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const daysMap = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
        const hari = daysMap[dateObj.getDay()];
        const jalur = blok.kelompokUmurMenu?.jalur;
        const mingguKe = getMingguKeFromDate(menu.tanggal, activePeriod?.tanggalMulai);

        if (!jalur) {
            toast.error('Jalur menu tidak ditemukan pada kelompok umur ini.');
            return;
        }

        try {
            const r = await request(`/gizi/master-menu/by-hari?periodeId=${periodeId}&jalur=${jalur}&hari=${hari}&mingguKe=${mingguKe}`);
            if (!r.ok) {
                toast.error('Gagal mengambil data master menu.');
                return;
            }
            const data = await r.json();
            if (!data) {
                toast.error(`Belum ada master menu buat ${hari} (Minggu ${mingguKe})`);
                return;
            }

            const itemsToCreate = [];
            if (data.menuKarbohidrat) itemsToCreate.push({ namaMenu: data.menuKarbohidrat, komponen: 'KARBOHIDRAT' });
            if (data.menuLaukHewani) itemsToCreate.push({ namaMenu: data.menuLaukHewani, komponen: 'LAUK_HEWANI' });
            if (data.menuLaukNabati) itemsToCreate.push({ namaMenu: data.menuLaukNabati, komponen: 'LAUK_NABATI' });
            if (data.menuSayur) itemsToCreate.push({ namaMenu: data.menuSayur, komponen: 'SAYUR' });
            if (data.menuBuah) itemsToCreate.push({ namaMenu: data.menuBuah, komponen: 'BUAH' });

            if (itemsToCreate.length === 0) {
                toast.warning('Master menu ditemukan tetapi semua komponen kosong.');
                return;
            }

            let createdCount = 0;
            for (const item of itemsToCreate) {
                const resCreate = await request('/gizi/menu-item', {
                    method: 'POST',
                    body: JSON.stringify({
                        blokId: blok.id,
                        namaMenu: item.namaMenu,
                        komponen: item.komponen
                    })
                });
                if (resCreate.ok) {
                    createdCount++;
                }
            }

            if (createdCount > 0) {
                toast.success(`Berhasil mengimpor ${createdCount} komponen menu dari Master.`);
                load(periodeId);
            } else {
                toast.error('Gagal mengimpor menu dari Master.');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat menerapkan master menu');
        }
    };

    const [activeBlokByMenu, setActiveBlokByMenu] = useState({});
    const [activeTabByBlok, setActiveTabByBlok] = useState({});
    const [selectedMenuItemByBlok, setSelectedMenuItemByBlok] = useState({});
    const [batasHargaMap, setBatasHargaMap] = useState({ KECIL: 8000, BESAR: 10000 });
    const [expandedComponents, setExpandedComponents] = useState({});
    const [expandedMenus, setExpandedMenus] = useState({});
    const [riwayatTanggalFilter, setRiwayatTanggalFilter] = useState('');
    const [riwayatKelompokUmurFilter, setRiwayatKelompokUmurFilter] = useState('');
    const [expandedRiwayatMenuId, setExpandedRiwayatMenuId] = useState(null);

    const KOMPONEN_OPTIONS = ['KARBOHIDRAT', 'LAUK_HEWANI', 'LAUK_NABATI', 'SAYUR', 'BUAH'];
    const KOMPONEN_LABEL = {
        KARBOHIDRAT: 'Karbohidrat',
        LAUK_HEWANI: 'Lauk Hewani',
        LAUK_NABATI: 'Lauk Nabati',
        SAYUR: 'Sayur',
        BUAH: 'Buah'
    };

    const activePeriod = periods.find(p => p.id === periodeId);
    const isEditableMenu = (menu) => menu?.status === 'DRAFT' || menu?.status === 'DITOLAK';

    const getBlokTotalHarga = (blokId) => {
        const itemsInBlok = menuItemsByBlok[blokId] || [];
        let total = 0;
        for (const item of itemsInBlok) {
            const bahanList = bahanByMenuItem[item.id] || [];
            for (const bahan of bahanList) {
                total += Number(bahan.totalHargaBahan || 0);
            }
        }
        return Math.round(total * 100) / 100;
    };

    const masterMenuColumns = [
        { key: 'tanggal', header: 'Tanggal', render: renderDate },
        { key: 'hari', header: 'Hari' },
        { key: 'jalur', header: 'Jalur' },
        { key: 'kelompokUmurMenu', header: 'Kelompok', render: (val) => val?.nama || '-' },
        { key: 'menuKarbohidrat', header: 'Karbohidrat', render: (val) => val || '-' },
        { key: 'menuLaukHewani', header: 'Lauk Hewani', render: (val) => val || '-' },
        { key: 'menuLaukNabati', header: 'Lauk Nabati', render: (val) => val || '-' },
        { key: 'menuSayur', header: 'Sayur', render: (val) => val || '-' },
        { key: 'menuBuah', header: 'Buah', render: (val) => val || '-' },
        {
            key: 'estimasiHargaPerPorsi',
            header: 'Estimasi / Porsi',
            align: 'right',
            render: (val, row) => val === null || val === undefined
                ? <span style={{ color: 'var(--text-muted)' }}>{row.jumlahBahanTanpaHargaPeriode || 0} bahan tanpa harga</span>
                : <strong>Rp{Number(val).toLocaleString('id-ID')}</strong>
        }
    ];

    useEffect(() => {
        request('/aslap/periode').then(r => r.json()).then(d => {
            setPeriods(d);
            if (d.length) setPeriodeId(d[0].id);
        });
    }, []);

    useEffect(() => {
        request('/gizi/kelompok-umur-menu').then(r => r.json()).then(d => {
            setKelompokUmur(d);
            if (d.length) setSelectedKelompokUmurId(d[0].id);
        });
    }, []);

    useEffect(() => {
        request('/mitra/bahan-pokok').then(r => r.json()).then(d => setBahanPokokList(d));
    }, []);

    useEffect(() => {
        request('/mitra/kendaraan')
            .then(r => r.json())
            .then(d => setKendaraanList(d))
            .catch(err => setError(err.message || 'Gagal memuat daftar kendaraan'));
    }, []);

    useEffect(() => {
        request('/aslap/kategori')
            .then(r => r.ok ? r.json() : [])
            .then(d => setKategoriList(d))
            .catch(() => {});
    }, []);

    useEffect(() => {
        request('/gizi/batas-harga-porsi')
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d && d.success && d.data) {
                    const map = {};
                    d.data.forEach(item => {
                        map[item.jenisPorsi] = Number(item.batasMaksimal);
                    });
                    setBatasHargaMap(map);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!periodeId) return;
        request(`/gizi/master-menu?periodeId=${periodeId}`)
            .then(r => r.ok ? r.json() : [])
            .then(d => setMasterMenuList(d))
            .catch(() => {});
        loadActualMasterMenu(periodeId);
    }, [periodeId]);

    const load = async (pid) => {
        if (!pid) return;
        const [rMenu, rPengiriman] = await Promise.all([
            request(`/gizi/menu-harian?periodeId=${pid}`),
            request('/gizi/pengiriman')
        ]);

        if (!rMenu.ok) { setError((await rMenu.json()).error); return; }
        if (!rPengiriman.ok) { setError((await rPengiriman.json()).error); return; }

        const data = await rMenu.json();
        const rawPengiriman = await rPengiriman.json();
        setItems(data);

        const pengirimanMap = {};
        for (const p of rawPengiriman) {
            if (!pengirimanMap[p.menuHarianId]) pengirimanMap[p.menuHarianId] = [];
            pengirimanMap[p.menuHarianId].push(p);
        }
        setPengirimanByMenu(pengirimanMap);

        const orgMap = {};
        const alergiMap = {};
        const menuItemMap = {};
        const bahanMap = {};
        for (const menu of data) {
            for (const blok of menu.blok) {
                if (blok.organoleptik) orgMap[blok.id] = blok.organoleptik;
                alergiMap[blok.id] = blok.alergi || [];
                menuItemMap[blok.id] = blok.menuItem || [];
                for (const item of (blok.menuItem || [])) {
                    bahanMap[item.id] = item.bahan || [];
                }
            }
        }
        setOrganoleptikByBlok(orgMap);
        setAlergiByBlok(alergiMap);
        setMenuItemsByBlok(menuItemMap);
        setBahanByMenuItem(bahanMap);

        const targetMap = {};
        for (const menu of data) {
            for (const blok of menu.blok) {
                targetMap[blok.id] = blok.targetGizi || null;
            }
        }
        setTargetGiziByBlok(targetMap);

        setActiveBlokByMenu(prev => {
            const next = { ...prev };
            for (const menu of data) {
                const stillExists = menu.blok.some(blok => blok.id === next[menu.id]);
                if (!stillExists) next[menu.id] = menu.blok[0]?.id || '';
            }
            return next;
        });
        setActiveTabByBlok(prev => {
            const next = { ...prev };
            for (const menu of data) {
                for (const blok of menu.blok) {
                    if (!next[blok.id]) next[blok.id] = 'menu';
                }
            }
            return next;
        });
        setSelectedMenuItemByBlok(prev => {
            const next = { ...prev };
            for (const menu of data) {
                for (const blok of menu.blok) {
                    const blokItems = blok.menuItem || [];
                    const stillExists = blokItems.some(item => item.id === next[blok.id]);
                    if (!stillExists) next[blok.id] = blokItems[0]?.id || '';
                }
            }
            return next;
        });
    };

    useEffect(() => { load(periodeId); }, [periodeId]);

    const create = async (e) => {
        e.preventDefault();
        setError('');
        const r = await request('/gizi/menu-harian', {
            method: 'POST',
            body: JSON.stringify({ periodeId, tanggal })
        });
        const d = await r.json();
        if (r.ok) { setTanggal(''); load(periodeId); }
        else toast.error(d.error);
    };

    const addBlok = async (menuHarianId) => {
        setError('');
        const r = await request('/gizi/menu-harian-blok', {
            method: 'POST',
            body: JSON.stringify({ menuHarianId, kelompokUmurMenuId: selectedKelompokUmurId })
        });
        const d = await r.json();
        if (r.ok) {
            setActiveBlokByMenu(prev => ({ ...prev, [menuHarianId]: d.id }));
            load(periodeId);
        } else setError(d.error);
    };

    const deleteBlok = async (blokId) => {
        setError('');
        const r = await request(`/gizi/menu-harian-blok/${blokId}`, { method: 'DELETE' });
        if (r.ok) load(periodeId);
        else setError((await r.json()).error);
    };

    const addMenuItem = async (blokId) => {
        setError('');
        const namaMenu = namaMenuInput[blokId];
        if (!namaMenu) { setError('namaMenu wajib diisi'); return; }
        const r = await request('/gizi/menu-item', {
            method: 'POST',
            body: JSON.stringify({ blokId, namaMenu, komponen: komponenInput[blokId] || undefined })
        });
        const d = await r.json();
        if (r.ok) {
            setMenuItemsByBlok(prev => ({ ...prev, [blokId]: [...(prev[blokId] || []), d] }));
            setNamaMenuInput(prev => ({ ...prev, [blokId]: '' }));
            setKomponenInput(prev => ({ ...prev, [blokId]: '' }));
            setSelectedMenuItemByBlok(prev => ({ ...prev, [blokId]: d.id }));
        } else setError(d.error);
    };

    const setBahanField = (menuItemId, field, value) => {
        setBahanForm(prev => ({ ...prev, [menuItemId]: { ...(prev[menuItemId] || {}), [field]: value } }));
    };

    const addBahan = async (menuItemId) => {
        setError('');
        const f = { ...(bahanForm[menuItemId] || {}) };
        if (f.bahanPokokId === undefined && bahanPokokList[0]) f.bahanPokokId = bahanPokokList[0].id;
        const required = ['bahanPokokId', 'beratBersihGr', 'energiKkal', 'proteinGr', 'lemakGr', 'karbohidratGr', 'seratGr', 'bddPersen', 'beratSatuanGr'];
        if (required.some(k => f[k] === undefined || f[k] === '')) { setError('Semua field bahan wajib diisi kecuali Berat URT'); return; }
        
        const payload = {
            menuItemId,
            ...f,
            jumlahHitungan: f.jumlahHitungan !== undefined && f.jumlahHitungan !== '' ? parseFloat(f.jumlahHitungan) : null
        };

        const r = await request('/gizi/menu-item-bahan', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const d = await r.json();
        if (r.ok) {
            setBahanByMenuItem(prev => ({ ...prev, [menuItemId]: [...(prev[menuItemId] || []), d] }));
            setBahanForm(prev => ({ ...prev, [menuItemId]: {} }));
        } else setError(d.error);
    };

    const setOrganoleptikField = (blokId, field, value) => {
        setOrganoleptikForm(prev => ({ ...prev, [blokId]: { ...(prev[blokId] || {}), [field]: value } }));
    };

    const addOrganoleptik = async (blokId) => {
        setError('');
        const f = organoleptikForm[blokId] || {};
        if (!f.rasa || !f.aroma || !f.tekstur || !f.suhuSaji) {
            setError('Rasa, aroma, tekstur, suhuSaji wajib diisi');
            return;
        }
        const r = await request('/gizi/menu-organoleptik', {
            method: 'POST',
            body: JSON.stringify({
                blokId,
                rasa: f.rasa,
                aroma: f.aroma,
                tekstur: f.tekstur,
                suhuSaji: f.suhuSaji,
                catatan: f.catatan || undefined,
                jumlahOmpreng: f.jumlahOmpreng || undefined,
                ujiPadaTanggal: f.ujiPadaTanggal || undefined
            })
        });
        const d = await r.json();
        if (r.ok) {
            setOrganoleptikByBlok(prev => ({ ...prev, [blokId]: d }));
            setOrganoleptikForm(prev => ({ ...prev, [blokId]: {} }));
        } else setError(d.error);
    };

    const setAlergiField = (blokId, field, value) => {
        setAlergiForm(prev => ({ ...prev, [blokId]: { ...(prev[blokId] || {}), [field]: value } }));
    };

    const addAlergi = async (blokId) => {
        setError('');
        const f = alergiForm[blokId] || {};
        if (!f.jenisAlergi || f.jumlahSiswa === undefined || f.jumlahSiswa === '') {
            setError('jenisAlergi dan jumlahSiswa wajib diisi');
            return;
        }
        const cleanJumlah = parseInt(f.jumlahSiswa, 10);
        if (isNaN(cleanJumlah) || cleanJumlah < 0) {
            setError('jumlahSiswa harus berupa bilangan bulat non-negatif');
            return;
        }
        const r = await request('/gizi/alergi-catatan', {
            method: 'POST',
            body: JSON.stringify({
                blokId,
                jenisAlergi: f.jenisAlergi,
                jumlahSiswa: cleanJumlah,
                bahanPengganti: f.bahanPengganti || undefined
            })
        });
        const d = await r.json();
        if (r.ok) {
            setAlergiByBlok(prev => ({ ...prev, [blokId]: [...(prev[blokId] || []), d] }));
            setAlergiForm(prev => ({ ...prev, [blokId]: {} }));
            toast.success('Catatan alergi berhasil ditambahkan');
        } else {
            setError(d.error);
            toast.error(d.error || 'Gagal menyimpan catatan alergi');
        }
    };

    const deleteAlergi = async (blokId, alergiId) => {
        setError('');
        const r = await request(`/gizi/alergi-catatan/${alergiId}`, { method: 'DELETE' });
        if (r.ok) {
            setAlergiByBlok(prev => ({ ...prev, [blokId]: (prev[blokId] || []).filter(item => item.id !== alergiId) }));
        } else setError((await r.json()).error);
    };

    const sumGizi = (itemsByBlok, blokId) => {
        const items = itemsByBlok[blokId] || [];
        let total = { energiKkal: 0, proteinGr: 0, lemakGr: 0, karbohidratGr: 0, seratGr: 0 };
        items.forEach(item => {
            (item.bahan || []).forEach(b => {
                total.energiKkal += b.energiKkal || 0;
                total.proteinGr += b.proteinGr || 0;
                total.lemakGr += b.lemakGr || 0;
                total.karbohidratGr += b.karbohidratGr || 0;
                total.seratGr += b.seratGr || 0;
            });
        });
        return total;
    };

    const triggerAjukanMenu = (id) => {
        setPendingMenuId(id);
        setConfirmOpen(true);
    };

    const handleAjukanMenu = async () => {
        if (!pendingMenuId) return;
        setConfirmOpen(false);
        try {
            const r = await request(`/gizi/menu-harian/${pendingMenuId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'DIAJUKAN' })
            });
            if (r.ok) {
                toast.success('Menu Harian berhasil diajukan ke Kepala SPPG.');
                load(periodeId);
            } else {
                const err = await r.json().catch(() => ({ error: 'Gagal mengajukan Menu Harian' }));
                toast.error(err.error || 'Gagal mengajukan Menu Harian');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setPendingMenuId(null);
        }
    };

    const handleStartEditPengiriman = (menuId, p) => {
        setPengirimanForm(prev => ({
            ...prev,
            [menuId]: {
                id: p.id,
                kategoriIds: (p.kategoriPenerima || []).map(k => k.id),
                kendaraanId: p.kendaraanId,
                catatan: p.catatan || ''
            }
        }));
    };

    const addPengiriman = async (menuHarianId) => {
        setError('');
        const form = pengirimanForm[menuHarianId] || {};
        if (!form.kategoriIds || form.kategoriIds.length === 0) { setError('Pilih minimal 1 kategori penerima'); return; }
        if (!form.kendaraanId) { setError('Pilih kendaraan'); return; }

        const payload = {
            menuHarianId,
            kategoriIds: form.kategoriIds,
            kendaraanId: form.kendaraanId,
            catatan: form.catatan || undefined
        };

        const isEdit = !!form.id;
        const url = isEdit ? `/gizi/pengiriman/${form.id}` : '/gizi/pengiriman';
        const method = isEdit ? 'PUT' : 'POST';

        const r = await request(url, {
            method,
            body: JSON.stringify(payload)
        });

        if (r.ok) {
            setPengirimanForm(prev => ({ 
                ...prev, 
                [menuHarianId]: { id: '', kategoriIds: [], kendaraanId: '', catatan: '' } 
            }));
            load(periodeId);
            toast.success(isEdit ? 'Pengiriman berhasil diperbarui.' : 'Pengiriman berhasil ditambahkan.');
        } else {
            const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
            setError(d.error || 'Terjadi kesalahan server saat menyimpan pengiriman');
        }
    };

    const deletePengiriman = async (id) => {
        setConfirmModal({
            open: true,
            title: 'Konfirmasi Hapus',
            message: 'Apakah Anda yakin ingin menghapus pengiriman ini?',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, open: false }));
                const r = await request(`/gizi/pengiriman/${id}`, { method: 'DELETE' });
                if (r.ok) load(periodeId);
                else {
                    const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                    setError(d.error || 'Terjadi kesalahan server saat menghapus pengiriman');
                }
            }
        });
    };

    const getBlokStatus = (blok) => {
        const menuItems = menuItemsByBlok[blok.id] || [];
        if (menuItems.length === 0) return { label: 'Belum ada menu', color: 'var(--text-muted)' };
        const kosongBahan = menuItems.filter(item => (bahanByMenuItem[item.id] || []).length === 0).length;
        if (kosongBahan > 0) return { label: `${kosongBahan} menu tanpa bahan`, color: 'var(--text-muted)' };
        return { label: 'Menu terisi', color: 'var(--color-success)' };
    };

    const menuAktif = items.filter(item => item.status !== 'DISETUJUI');
    const menuRiwayat = items.filter(item => item.status === 'DISETUJUI');

    // Extract blocks from menuRiwayat to list them in the history view
    const riwayatBlocks = [];
    for (const menu of menuRiwayat) {
        for (const blok of menu.blok) {
            riwayatBlocks.push({
                menuId: menu.id,
                blokId: blok.id,
                tanggal: menu.tanggal,
                kelompokUmurId: blok.kelompokUmurMenuId,
                kelompokUmurNama: blok.kelompokUmurMenu?.nama || blok.kelompokUmurMenuId,
                menuSummary: (blok.menuItem || []).map(mi => mi.namaMenu).join(', ') || '—',
                rawMenu: menu,
                rawBlok: blok
            });
        }
    }

    // Filter riwayat blocks based on selected filters
    const filteredRiwayatBlocks = riwayatBlocks.filter(b => {
        if (riwayatTanggalFilter && b.tanggal.split('T')[0] !== riwayatTanggalFilter) return false;
        if (riwayatKelompokUmurFilter && b.kelompokUmurId !== riwayatKelompokUmurFilter) return false;
        return true;
    });

    // Generate options for the filters
    const riwayatTanggalOptions = [
        { value: '', label: 'Semua Tanggal' },
        ...Array.from(new Set(menuRiwayat.map(item => item.tanggal.split('T')[0]))).sort().map(tStr => ({
            value: tStr,
            label: formatDate(tStr)
        }))
    ];

    const riwayatKelompokUmurOptions = [
        { value: '', label: 'Semua Kelompok Umur' },
        ...kelompokUmur.map(k => ({ value: k.id, label: k.nama }))
    ];

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: 20 }}>Menu Harian</h2>
            {error && (
                <div style={{ color: 'var(--color-danger)', margin: '10px 0', padding: 8, border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                    {error}
                </div>
            )}

            <div style={{ maxWidth: 360, marginBottom: 24, border: '1px solid var(--border)', padding: 14, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)' }}>
                {fieldLabel('Pilih Periode Aktif')}
                <Dropdown value={periodeId} onChange={setPeriodeId} options={periods.map(p => ({ value: p.id, label: `${p.tanggalMulai.split('T')[0]} - ${p.tanggalSelesai.split('T')[0]}` }))} />
            </div>

            {/* Section 1: Master Menu Mingguan (Referensi) */}
            <section style={{ border: '1px solid var(--border)', padding: 24, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)', marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)' }}>Master Menu Mingguan (Referensi)</h3>
                <Table columns={masterMenuColumns} data={masterMenuList} emptyText="Belum ada histori menu disetujui untuk periode ini." scrollHeight={300} />
            </section>

            {/* Section 2: Setup Master Menu */}
            <MasterMenuSetup
                actualMasterMenuList={actualMasterMenuList}
                masterForm={masterForm}
                showMasterModal={showMasterModal}
                submitMasterMenu={submitMasterMenu}
                deleteMasterMenu={deleteMasterMenu}
                fetchMasterByHari={fetchMasterByHari}
                setMasterForm={setMasterForm}
                setShowMasterModal={setShowMasterModal}
                fieldLabel={fieldLabel}
                buttonStyle={buttonStyle}
            />

            {/* Section 3: Input Menu Harian Aktual */}
            <MenuHarianForm
                tanggal={tanggal}
                setTanggal={setTanggal}
                create={create}
                activePeriod={activePeriod}
                items={items}
                fieldLabel={fieldLabel}
                buttonStyle={buttonStyle}
            />

            <section style={{ marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 16px 0', color: 'var(--text)' }}>Input Menu Harian Aktual</h3>
                {menuAktif.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}>
                        Belum ada menu harian aktif untuk periode ini.
                    </div>
                ) : menuAktif.map(menu => (
                    <MenuHarianWorkspace
                        key={menu.id}
                        menu={menu}
                        activePeriod={activePeriod}
                        expandedMenus={expandedMenus}
                        setExpandedMenus={setExpandedMenus}
                        isEditableMenu={isEditableMenu}
                        formatDate={formatDate}
                        triggerAjukanMenu={triggerAjukanMenu}
                        fieldLabel={fieldLabel}
                        buttonStyle={buttonStyle}
                        toast={toast}
                        activeBlokByMenu={activeBlokByMenu}
                        setActiveBlokByMenu={setActiveBlokByMenu}
                        activeTabByBlok={activeTabByBlok}
                        setActiveTabByBlok={setActiveTabByBlok}
                        selectedKelompokUmurId={selectedKelompokUmurId}
                        setSelectedKelompokUmurId={setSelectedKelompokUmurId}
                        kelompokUmur={kelompokUmur}
                        menuItemsByBlok={menuItemsByBlok}
                        bahanByMenuItem={bahanByMenuItem}
                        targetGiziByBlok={targetGiziByBlok}
                        batasHargaMap={batasHargaMap}
                        getBlokStatus={getBlokStatus}
                        getBlokTotalHarga={getBlokTotalHarga}
                        sumGizi={sumGizi}
                        deleteBlok={deleteBlok}
                        addBlok={addBlok}
                        bahanForm={bahanForm}
                        bahanPokokList={bahanPokokList}
                        selectedMenuItemByBlok={selectedMenuItemByBlok}
                        expandedComponents={expandedComponents}
                        komponenInput={komponenInput}
                        namaMenuInput={namaMenuInput}
                        setSelectedMenuItemByBlok={setSelectedMenuItemByBlok}
                        setKomponenInput={setKomponenInput}
                        setNamaMenuInput={setNamaMenuInput}
                        setExpandedComponents={setExpandedComponents}
                        setBahanField={setBahanField}
                        addBahan={addBahan}
                        addMenuItem={addMenuItem}
                        applyMasterMenu={applyMasterMenu}
                        getBahanName={getBahanName}
                        getBahanLabel={getBahanLabel}
                        KOMPONEN_OPTIONS={KOMPONEN_OPTIONS}
                        KOMPONEN_LABEL={KOMPONEN_LABEL}
                        alergiByBlok={alergiByBlok}
                        alergiForm={alergiForm}
                        setAlergiField={setAlergiField}
                        addAlergi={addAlergi}
                        deleteAlergi={deleteAlergi}
                        organoleptikByBlok={organoleptikByBlok}
                        organoleptikForm={organoleptikForm}
                        setOrganoleptikField={setOrganoleptikField}
                        addOrganoleptik={addOrganoleptik}
                        getTanggalMusnah={getTanggalMusnah}
                        pengirimanByMenu={pengirimanByMenu}
                        pengirimanForm={pengirimanForm}
                        kendaraanList={kendaraanList}
                        kategoriList={kategoriList}
                        handleStartEditPengiriman={handleStartEditPengiriman}
                        addPengiriman={addPengiriman}
                        deletePengiriman={deletePengiriman}
                        setPengirimanForm={setPengirimanForm}
                    />
                ))}
            </section>

            {/* Section 4: Riwayat Menu (Disetujui) */}
            <RiwayatMenu
                filteredRiwayatBlocks={filteredRiwayatBlocks}
                riwayatTanggalFilter={riwayatTanggalFilter}
                setRiwayatTanggalFilter={setRiwayatTanggalFilter}
                riwayatKelompokUmurFilter={riwayatKelompokUmurFilter}
                setRiwayatKelompokUmurFilter={setRiwayatKelompokUmurFilter}
                riwayatTanggalOptions={riwayatTanggalOptions}
                riwayatKelompokUmurOptions={riwayatKelompokUmurOptions}
                expandedRiwayatMenuId={expandedRiwayatMenuId}
                setExpandedRiwayatMenuId={setExpandedRiwayatMenuId}
                formatDate={formatDate}
                fieldLabel={fieldLabel}
                buttonStyle={buttonStyle}
                menuItemsByBlok={menuItemsByBlok}
                bahanByMenuItem={bahanByMenuItem}
                bahanForm={bahanForm}
                bahanPokokList={bahanPokokList}
                selectedMenuItemByBlok={selectedMenuItemByBlok}
                expandedComponents={expandedComponents}
                komponenInput={komponenInput}
                namaMenuInput={namaMenuInput}
                setSelectedMenuItemByBlok={setSelectedMenuItemByBlok}
                setKomponenInput={setKomponenInput}
                setNamaMenuInput={setNamaMenuInput}
                setExpandedComponents={setExpandedComponents}
                setBahanField={setBahanField}
                addBahan={addBahan}
                addMenuItem={addMenuItem}
                applyMasterMenu={applyMasterMenu}
                getBahanName={getBahanName}
                getBahanLabel={getBahanLabel}
                KOMPONEN_OPTIONS={KOMPONEN_OPTIONS}
                KOMPONEN_LABEL={KOMPONEN_LABEL}
                toast={toast}
            />

            <ConfirmDialog
                open={confirmOpen}
                title="Konfirmasi Pengajuan"
                message="Ajukan Menu Harian ini ke Kepala SPPG untuk persetujuan?"
                onConfirm={handleAjukanMenu}
                onCancel={() => {
                    setConfirmOpen(false);
                    setPendingMenuId(null);
                }}
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
