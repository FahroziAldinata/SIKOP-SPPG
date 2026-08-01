import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate, renderStatus, renderTruncate } from '../../components/Table';
import Dropdown from '../../components/Dropdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';

const KOMPONEN_LABEL = {
    KARBOHIDRAT: 'Karbohidrat Utama',
    LAUK_HEWANI: 'Lauk Hewani',
    LAUK_NABATI: 'Lauk Nabati',
    SAYUR: 'Sayur',
    BUAH: 'Buah / Pelengkap'
};

export const ApprovalPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');

    // State Approval
    const [approvalList, setApprovalList] = useState([]);

    // State Pending Targets (DIAJUKAN)
    const [pendingMenuList, setPendingMenuList] = useState([]);
    const [pendingRabList, setPendingRabList] = useState([]);

    // State for Detail Modal
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailType, setDetailType] = useState(null); // 'MENU' | 'RAB'
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [bahanPokokMap, setBahanPokokMap] = useState({});

    // State for ConfirmDialog
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        targetType: '',
        targetId: '',
        status: '',
        title: '',
        message: '',
        requireInput: false,
        inputPlaceholder: ''
    });

    // Fetch list periode saat mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => {});
    }, []);

    // Trigger loadApprovals + loadPendingTargets setiap periodeId berubah
    useEffect(() => {
        if (periodeId) {
            loadApprovals(periodeId);
            loadPendingTargets(periodeId);
        }
    }, [periodeId]);

    const loadApprovals = async (pid) => {
        if (!pid) return;
        try {
            const r = await request(`/kepala/approval?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setApprovalList(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat riwayat approval' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const loadPendingTargets = async (pid) => {
        if (!pid) return;
        try {
            const [menuRes, rabRes] = await Promise.all([
                request(`/gizi/menu-harian?periodeId=${pid}`),
                request(`/akuntan/rab-harian?periodeId=${pid}`)
            ]);

            const menuData = menuRes.ok ? await menuRes.json() : [];
            const rabData = rabRes.ok ? await rabRes.json() : [];

            // Filter hanya yang statusnya DIAJUKAN (siap untuk di-approve/reject)
            setPendingMenuList(menuData.filter(m => m.status === 'DIAJUKAN'));
            setPendingRabList(rabData.filter(r => r.status === 'DIAJUKAN'));

            if (!menuRes.ok) toast.error('Gagal memuat data menu harian.');
            if (!rabRes.ok) toast.error('Gagal memuat data RAB harian.');
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const openDetailModal = async (type, id) => {
        setDetailType(type);
        setDetailLoading(true);
        setDetailData(null);
        setDetailModalOpen(true);

        try {
            if (type === 'MENU') {
                const [resMenu, resBahan] = await Promise.all([
                    request(`/gizi/menu-harian/${id}`),
                    request('/mitra/bahan-pokok').catch(() => null)
                ]);

                if (resBahan && resBahan.ok) {
                    const bList = await resBahan.json();
                    const bMap = {};
                    (bList || []).forEach(b => { bMap[b.id] = b; });
                    setBahanPokokMap(bMap);
                }

                if (resMenu.ok) {
                    const data = await resMenu.json();
                    setDetailData(data);
                } else {
                    const d = await resMenu.json().catch(() => ({ error: 'Gagal mengambil detail menu harian' }));
                    toast.error(d.error || 'Gagal mengambil detail menu harian');
                    setDetailModalOpen(false);
                }
            } else if (type === 'RAB') {
                const resRab = await request(`/akuntan/rab-harian/${id}`);
                if (resRab.ok) {
                    const data = await resRab.json();
                    setDetailData(data);
                } else {
                    const d = await resRab.json().catch(() => ({ error: 'Gagal mengambil detail RAB harian' }));
                    toast.error(d.error || 'Gagal mengambil detail RAB harian');
                    setDetailModalOpen(false);
                }
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setDetailModalOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetailModal = () => {
        setDetailModalOpen(false);
        setDetailData(null);
        setDetailType(null);
    };

    const triggerSetujui = (targetType, targetId) => {
        setConfirmConfig({
            targetType,
            targetId,
            status: 'DISETUJUI',
            title: 'Konfirmasi Persetujuan',
            message: `Apakah Anda yakin ingin menyetujui ${targetType === 'MENU' ? 'Menu Harian' : 'RAB Harian'} ini?`,
            requireInput: false,
            inputPlaceholder: ''
        });
        setConfirmOpen(true);
    };

    const triggerTolak = (targetType, targetId) => {
        setConfirmConfig({
            targetType,
            targetId,
            status: 'DITOLAK',
            title: 'Konfirmasi Penolakan',
            message: `Berikan catatan penolakan untuk ${targetType === 'MENU' ? 'Menu Harian' : 'RAB Harian'} ini (catatan wajib diisi):`,
            requireInput: true,
            inputPlaceholder: 'Catatan penolakan (wajib)...'
        });
        setConfirmOpen(true);
    };

    const handleApproval = async (catatan) => {
        const { targetType, targetId, status } = confirmConfig;
        setConfirmOpen(false);

        // Validasi status nilai
        if (status !== 'DISETUJUI' && status !== 'DITOLAK') {
            toast.error('Status approval harus DISETUJUI atau DITOLAK.');
            return;
        }

        // Validasi catatan wajib jika DITOLAK - mirror validasi backend
        if (status === 'DITOLAK' && (!catatan || catatan.trim() === '')) {
            toast.error('Catatan wajib diisi jika status ditolak.');
            return;
        }

        // Build body: tepat satu dari menuHarianId/rabHarianId terisi.
        const body = { status };
        if (catatan) {
            body.catatan = catatan;
        }

        if (targetType === 'MENU') {
            body.menuHarianId = targetId;
        } else if (targetType === 'RAB') {
            body.rabHarianId = targetId;
        } else {
            toast.error('Developer error: targetType tidak valid.');
            return;
        }

        try {
            const r = await request('/kepala/approval', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (r.ok) {
                toast.success(status === 'DISETUJUI' ? 'Berhasil disetujui.' : 'Berhasil ditolak.');
                // Refresh kedua: riwayat approval + tabel pending
                loadApprovals(periodeId);
                loadPendingTargets(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                toast.error(d.error || 'Gagal memproses approval');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const calculateBlockGizi = (blok) => {
        const target = blok.targetGizi || {};
        let totalEnergi = 0;
        let totalProtein = 0;
        let totalLemak = 0;
        let totalKarbo = 0;
        let totalSerat = 0;
        let totalBiayaPorsi = 0;

        (blok.menuItem || []).forEach(item => {
            (item.bahan || []).forEach(b => {
                totalEnergi += Number(b.energiKkal || 0);
                totalProtein += Number(b.proteinGr || 0);
                totalLemak += Number(b.lemakGr || 0);
                totalKarbo += Number(b.karbohidratGr || 0);
                totalSerat += Number(b.seratGr || 0);
                totalBiayaPorsi += Number(b.totalHargaBahan || 0);
            });
        });

        const getPercent = (real, tgt) => {
            const t = Number(tgt || 0);
            if (!t) return '-';
            return Math.round((real / t) * 100) + '%';
        };

        return {
            target: {
                energi: Number(target.targetEnergi || 0),
                protein: Number(target.targetProtein || 0),
                lemak: Number(target.targetLemak || 0),
                karbo: Number(target.targetKarbohidrat || 0),
                serat: Number(target.targetSerat || 0),
            },
            realisasi: {
                energi: Math.round(totalEnergi * 10) / 10,
                protein: Math.round(totalProtein * 10) / 10,
                lemak: Math.round(totalLemak * 10) / 10,
                karbo: Math.round(totalKarbo * 10) / 10,
                serat: Math.round(totalSerat * 10) / 10,
            },
            pct: {
                energi: getPercent(totalEnergi, target.targetEnergi),
                protein: getPercent(totalProtein, target.targetProtein),
                lemak: getPercent(totalLemak, target.targetLemak),
                karbo: getPercent(totalKarbo, target.targetKarbohidrat),
                serat: getPercent(totalSerat, target.targetSerat),
            },
            totalBiayaPorsi,
            totalBiayaPenerima: totalBiayaPorsi * Number(blok.totalPenerima || 0)
        };
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Dashboard Kepala SPPG</h2>
            {/* Pilihan Periode */}
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
                    Periode
                </label>
                <Dropdown
                    style={{ width: '100%' }}
                    value={periodeId}
                    onChange={setPeriodeId}
                    options={periods.map(p => ({
                        value: p.id,
                        label: `${p.tanggalMulai.split('T')[0]} - ${p.tanggalSelesai.split('T')[0]}`
                    }))}
                />
            </div>

            <hr style={{ margin: '20px 0' }} />

            {/* ================================================ */}
            {/* SECTION: MENU HARIAN MENUNGGU APPROVAL           */}
            {/* ================================================ */}
            <h3>Menu Harian - Menunggu Persetujuan</h3>
            <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                    { key: 'status', header: 'Status', render: (v) => renderStatus(v) },
                    {
                        key: 'id',
                        header: 'Aksi',
                        render: (_, row) => (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => openDetailModal('MENU', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-primary, #0284c7)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Detail
                                </button>
                                <button
                                    onClick={() => triggerSetujui('MENU', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Setujui
                                </button>
                                <button
                                    onClick={() => triggerTolak('MENU', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-danger)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Tolak
                                </button>
                            </div>
                        )
                    }
                ]}
                data={pendingMenuList}
                emptyText="Tidak ada menu harian yang menunggu persetujuan."
            />

            <hr style={{ margin: '20px 0' }} />

            {/* ================================================ */}
            {/* SECTION: RAB HARIAN MENUNGGU APPROVAL            */}
            {/* ================================================ */}
            <h3>RAB Harian - Menunggu Persetujuan</h3>
            <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                    { key: 'status', header: 'Status', render: (v) => renderStatus(v) },
                    { key: 'createdBy', header: 'Dibuat Oleh', render: (v) => v?.nama || v?.username || '-' },
                    {
                        key: 'id',
                        header: 'Aksi',
                        render: (_, row) => (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => openDetailModal('RAB', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-primary, #0284c7)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Detail
                                </button>
                                <button
                                    onClick={() => triggerSetujui('RAB', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Setujui
                                </button>
                                <button
                                    onClick={() => triggerTolak('RAB', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-danger)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Tolak
                                </button>
                            </div>
                        )
                    }
                ]}
                data={pendingRabList}
                emptyText="Tidak ada RAB harian yang menunggu persetujuan."
            />

            <hr style={{ margin: '20px 0' }} />

            {/* ================================================ */}
            {/* SECTION: RIWAYAT APPROVAL                        */}
            {/* ================================================ */}
            <h3>Riwayat Approval</h3>
            <Table
                columns={[
                    {
                        key: 'id',
                        header: 'Jenis',
                        render: (_, row) => row.menuHarian ? 'Menu Harian' : 'RAB Harian'
                    },
                    {
                        key: 'id',
                        header: 'Tanggal Dokumen',
                        render: (_, row) => renderDate(row.menuHarian ? row.menuHarian.tanggal : row.rabHarian?.tanggal)
                    },
                    { key: 'status', header: 'Status', render: (v) => renderStatus(v) },
                    { key: 'catatan', header: 'Catatan', render: (v) => renderTruncate(v) },
                    { key: 'approvedBy', header: 'Diproses Oleh', render: (v) => v?.nama || v?.username || '-' },
                    {
                        key: 'createdAt',
                        header: 'Waktu Approval',
                        render: (v) => new Date(v).toLocaleString('id-ID')
                    }
                ]}
                data={approvalList}
                emptyText="Belum ada riwayat approval untuk periode ini."
            />

            {/* Modal Confirm Setujui / Tolak */}
            <ConfirmDialog
                open={confirmOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                requireInput={confirmConfig.requireInput}
                inputPlaceholder={confirmConfig.inputPlaceholder}
                inputRequired={confirmConfig.requireInput}
                errorMessage="Catatan wajib diisi untuk melanjutkan penolakan."
                onConfirm={handleApproval}
                onCancel={() => {
                    setConfirmOpen(false);
                }}
            />

            {/* ================================================ */}
            {/* MODAL PREVIEW DETAIL (MENU HARIAN / RAB HARIAN) */}
            {/* ================================================ */}
            {detailModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-elevated, #ffffff)',
                        border: '1px solid var(--border, #e2e8f0)',
                        borderRadius: 'var(--radius-md, 8px)',
                        padding: '24px',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '90vh',
                        boxShadow: 'var(--shadow-hover, 0 10px 25px rgba(0,0,0,0.15))',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '14px',
                            marginBottom: '16px',
                            borderBottom: '1px solid var(--border)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                                {detailType === 'MENU' ? 'Detail & Preview Menu Harian' : 'Detail & Preview RAB Harian'}
                            </h3>
                            <button
                                onClick={closeDetailModal}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    padding: '0 4px'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Content / Body */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                            {detailLoading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Memuat data detail...
                                </div>
                            ) : detailData ? (
                                detailType === 'MENU' ? (
                                    /* MENU HARIAN DETAIL */
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <div><strong>Tanggal:</strong> {renderDate(detailData.tanggal)}</div>
                                            <div><strong>Status:</strong> {renderStatus(detailData.status)}</div>
                                            <div><strong>Total Blok:</strong> {detailData.blok?.length || 0}</div>
                                        </div>

                                        {(!detailData.blok || detailData.blok.length === 0) ? (
                                            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada blok menu.</div>
                                        ) : (
                                            detailData.blok.map((blok, bIdx) => {
                                                const gizi = calculateBlockGizi(blok);
                                                const katNames = (blok.kelompokUmurMenu?.kategoriPenerima || []).map(k => k.nama).join(', ');

                                                return (
                                                    <div key={blok.id || bIdx} style={{
                                                        border: '1px solid var(--border)',
                                                        borderRadius: 'var(--radius-sm, 6px)',
                                                        padding: '16px',
                                                        backgroundColor: 'var(--bg, #f8fafc)'
                                                    }}>
                                                        {/* Block Title & Meta */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                                                            <div>
                                                                <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '15px' }}>
                                                                    {blok.kelompokUmurMenu?.nama || 'Blok Menu'} {blok.kelompokUmurMenu?.rentangUsia ? `(${blok.kelompokUmurMenu.rentangUsia})` : ''}
                                                                </h4>
                                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                    Kategori: {katNames || '-'}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary, #0284c7)' }}>
                                                                    Penerima: {blok.totalPenerima || 0} porsi
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Target vs Realisasi Gizi Table */}
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                                                Target vs Realisasi Nutrisi
                                                            </div>
                                                            <div style={{ overflowX: 'auto' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', backgroundColor: 'var(--bg-elevated, #fff)', border: '1px solid var(--border)' }}>
                                                                    <thead>
                                                                        <tr style={{ backgroundColor: 'var(--table-header-bg, #f1f5f9)' }}>
                                                                            <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Nutrisi</th>
                                                                            <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Target AKG</th>
                                                                            <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Realisasi</th>
                                                                            <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Pemenuhan</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        <tr>
                                                                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>Energi</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{gizi.target.energi} kkal</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{gizi.realisasi.energi} kkal</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{gizi.pct.energi}</td>
                                                                        </tr>
                                                                        <tr>
                                                                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>Protein</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{gizi.target.protein} g</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{gizi.realisasi.protein} g</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{gizi.pct.protein}</td>
                                                                        </tr>
                                                                        <tr>
                                                                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>Lemak</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{gizi.target.lemak} g</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{gizi.realisasi.lemak} g</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{gizi.pct.lemak}</td>
                                                                        </tr>
                                                                        <tr>
                                                                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>Karbohidrat</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{gizi.target.karbo} g</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{gizi.realisasi.karbo} g</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{gizi.pct.karbo}</td>
                                                                        </tr>
                                                                        <tr>
                                                                            <td style={{ padding: '6px 10px' }}>Serat</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>{gizi.target.serat} g</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>{gizi.realisasi.serat} g</td>
                                                                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{gizi.pct.serat}</td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>

                                                        {/* Biaya Summary */}
                                                        <div style={{
                                                            padding: '10px 12px',
                                                            backgroundColor: 'var(--bg-elevated, #fff)',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '4px',
                                                            fontSize: '13px',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            flexWrap: 'wrap',
                                                            gap: '10px',
                                                            marginBottom: '16px'
                                                        }}>
                                                            <span><strong>Biaya / Porsi:</strong> Rp{Number(gizi.totalBiayaPorsi || 0).toLocaleString('id-ID')}</span>
                                                            <span><strong>Est. Total Biaya ({blok.totalPenerima || 0} Penerima):</strong> Rp{Number(gizi.totalBiayaPenerima || 0).toLocaleString('id-ID')}</span>
                                                        </div>

                                                        {/* Menu Items & Bahan */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                                                Daftar Menu & Bahan Makanan
                                                            </div>
                                                            {(!blok.menuItem || blok.menuItem.length === 0) ? (
                                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada menu item.</div>
                                                            ) : (
                                                                blok.menuItem.map((item, iIdx) => (
                                                                    <div key={item.id || iIdx} style={{
                                                                        border: '1px solid var(--border)',
                                                                        borderRadius: '4px',
                                                                        padding: '10px',
                                                                        backgroundColor: 'var(--bg-elevated, #fff)'
                                                                    }}>
                                                                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span>{item.namaMenu}</span>
                                                                            {item.komponen && (
                                                                                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>
                                                                                    {KOMPONEN_LABEL[item.komponen] || item.komponen}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {(!item.bahan || item.bahan.length === 0) ? (
                                                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tidak ada rincian bahan.</div>
                                                                        ) : (
                                                                            <div style={{ overflowX: 'auto' }}>
                                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                                                    <thead>
                                                                                        <tr style={{ backgroundColor: 'var(--bg-muted, #f8fafc)', color: 'var(--text-muted)' }}>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Bahan</th>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Berat (Gr)</th>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>URT</th>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Satuan</th>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Energi</th>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Prot</th>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Lmk</th>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Krb</th>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Srt</th>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Harga Satuan</th>
                                                                                            <th style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Total Harga</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {item.bahan.map((b, bItemIdx) => {
                                                                                            const bName = b.bahanPokok?.nama || bahanPokokMap[b.bahanPokokId]?.nama || 'Bahan';
                                                                                            const bSatuan = b.bahanPokok?.satuan || bahanPokokMap[b.bahanPokokId]?.satuan || 'gr';
                                                                                            return (
                                                                                                <tr key={b.id || bItemIdx}>
                                                                                                    <td style={{ padding: '4px 6px', borderBottom: '1px solid var(--border)' }}>{bName}</td>
                                                                                                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{b.beratBersihGr}g</td>
                                                                                                    <td style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{b.beratURT || '-'}</td>
                                                                                                    <td style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{bSatuan}</td>
                                                                                                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{b.energiKkal || 0}</td>
                                                                                                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{b.proteinGr || 0}</td>
                                                                                                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{b.lemakGr || 0}</td>
                                                                                                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{b.karbohidratGr || 0}</td>
                                                                                                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{b.seratGr || 0}</td>
                                                                                                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Rp{Number(b.hargaSatuan || 0).toLocaleString('id-ID')}</td>
                                                                                                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Rp{Number(b.totalHargaBahan || 0).toLocaleString('id-ID')}</td>
                                                                                                </tr>
                                                                                            );
                                                                                        })}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>

                                                        {/* Organoleptik & Alergi Notes */}
                                                        {(blok.organoleptik || (blok.alergi && blok.alergi.length > 0)) && (
                                                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                {blok.organoleptik && (
                                                                    <div>
                                                                        <strong>Uji Organoleptik:</strong> Rasa: {blok.organoleptik.rasa || '-'}, Aroma: {blok.organoleptik.aroma || '-'}, Tekstur: {blok.organoleptik.tekstur || '-'}, Suhu Saji: {blok.organoleptik.suhuSaji || '-'}
                                                                        {blok.organoleptik.catatan && <span> ({blok.organoleptik.catatan})</span>}
                                                                    </div>
                                                                )}
                                                                {blok.alergi && blok.alergi.length > 0 && (
                                                                    <div>
                                                                        <strong>Catatan Alergi:</strong> {blok.alergi.map((a, aIdx) => `${a.jenisAlergi} (${a.jumlahSiswa} siswa${a.bahanPengganti ? `, pengganti: ${a.bahanPengganti}` : ''})`).join('; ')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : (
                                    /* RAB HARIAN DETAIL */
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* RAB Header Info */}
                                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <div><strong>Tanggal RAB:</strong> {renderDate(detailData.tanggal)}</div>
                                            <div><strong>Status:</strong> {renderStatus(detailData.status)}</div>
                                            <div><strong>Dibuat Oleh:</strong> {detailData.createdBy?.nama || detailData.createdBy?.username || '-'}</div>
                                        </div>

                                        {/* Summary Financial Cards */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                            <div style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', backgroundColor: 'var(--bg, #f8fafc)' }}>
                                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Total Kebutuhan</div>
                                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
                                                    Rp{Number(detailData.totalKebutuhan || 0).toLocaleString('id-ID')}
                                                </div>
                                            </div>
                                            <div style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', backgroundColor: 'var(--bg, #f8fafc)' }}>
                                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Total Pagu</div>
                                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
                                                    Rp{Number(detailData.totalPagu || 0).toLocaleString('id-ID')}
                                                </div>
                                            </div>
                                            <div style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', backgroundColor: 'var(--bg, #f8fafc)' }}>
                                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Selisih</div>
                                                <div style={{
                                                    fontSize: '18px',
                                                    fontWeight: 700,
                                                    color: Number(detailData.selisih || 0) < 0 ? 'var(--color-danger, #ef4444)' : 'var(--color-success, #22c55e)',
                                                    marginTop: '4px'
                                                }}>
                                                    Rp{Number(detailData.selisih || 0).toLocaleString('id-ID')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Harian Info if associated */}
                                        {detailData.menuHarian && (
                                            <div style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', backgroundColor: 'var(--bg, #f8fafc)' }}>
                                                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                                                    Acuan Menu Harian (Tanggal: {renderDate(detailData.menuHarian.tanggal)})
                                                </div>
                                                {detailData.menuHarian.blok && detailData.menuHarian.blok.length > 0 && (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {detailData.menuHarian.blok.map((b, bIdx) => (
                                                            <div key={b.id || bIdx}>
                                                                • <strong>{b.kelompokUmurMenu?.nama || 'Blok'}:</strong> {(b.menuItem || []).map(m => m.namaMenu).join(', ') || 'Belum ada menu'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* RAB Items Table */}
                                        <div>
                                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text)' }}>Rincian Kebutuhan Bahan (RAB Items)</h4>
                                            {(!detailData.items || detailData.items.length === 0) ? (
                                                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>Tidak ada item RAB.</div>
                                            ) : (
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid var(--border)' }}>
                                                        <thead>
                                                            <tr style={{ backgroundColor: 'var(--table-header-bg, #f1f5f9)', color: 'var(--table-header-text, #475569)' }}>
                                                                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Bahan Pokok</th>
                                                                <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Qty Siswa</th>
                                                                <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Qty B3</th>
                                                                <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Qty Total</th>
                                                                <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Satuan</th>
                                                                <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Harga Satuan</th>
                                                                <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Subtotal</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {detailData.items.map((item, idx) => (
                                                                <tr key={item.id || idx}>
                                                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{item.bahanPokok?.nama || '-'}</td>
                                                                    <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{Number(item.qtySiswa || 0).toLocaleString('id-ID')}</td>
                                                                    <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{Number(item.qtyB3 || 0).toLocaleString('id-ID')}</td>
                                                                    <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{Number(item.qtyTotal || 0).toLocaleString('id-ID')}</td>
                                                                    <td style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{item.satuan || item.bahanPokok?.satuan || '-'}</td>
                                                                    <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Rp{Number(item.hargaSatuan || 0).toLocaleString('id-ID')}</td>
                                                                    <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Rp{Number(item.subtotal || 0).toLocaleString('id-ID')}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {/* Status PO Pembelian (jika ada) */}
                                        {detailData.transaksiPembelian && detailData.transaksiPembelian.length > 0 && (
                                            <div>
                                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text)' }}>Status PO Pembelian</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {detailData.transaksiPembelian.map((po, poIdx) => (
                                                        <div key={po.id || poIdx} style={{
                                                            padding: '10px 14px',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '6px',
                                                            backgroundColor: 'var(--bg, #f8fafc)',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            fontSize: '13px'
                                                        }}>
                                                            <div>
                                                                <strong>Supplier:</strong> {po.supplier?.nama || '-'}
                                                                {po.catatan && <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>({po.catatan})</span>}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{po.items?.length || 0} item</span>
                                                                {renderStatus(po.status)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Data detail tidak ditemukan.
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            marginTop: '16px',
                            paddingTop: '14px',
                            borderTop: '1px solid var(--border)'
                        }}>
                            <button
                                onClick={closeDetailModal}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: 'var(--bg-muted, #e2e8f0)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm, 4px)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px'
                                }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
