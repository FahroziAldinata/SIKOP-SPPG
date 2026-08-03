import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ApprovalPeriodSelector } from '../../components/kepala/approval/ApprovalPeriodSelector';
import { MenuApprovalTable } from '../../components/kepala/approval/MenuApprovalTable';
import { RabApprovalTable } from '../../components/kepala/approval/RabApprovalTable';
import { RiwayatApprovalTable } from '../../components/kepala/approval/RiwayatApprovalTable';
import { ApprovalDetailModal } from '../../components/kepala/approval/ApprovalDetailModal';

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

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Dashboard Kepala SPPG</h2>
            <ApprovalPeriodSelector
                periods={periods}
                periodeId={periodeId}
                setPeriodeId={setPeriodeId}
            />

            <hr style={{ margin: '20px 0' }} />

            <MenuApprovalTable
                pendingMenuList={pendingMenuList}
                openDetailModal={openDetailModal}
                triggerSetujui={triggerSetujui}
                triggerTolak={triggerTolak}
            />

            <hr style={{ margin: '20px 0' }} />

            <RabApprovalTable
                pendingRabList={pendingRabList}
                openDetailModal={openDetailModal}
                triggerSetujui={triggerSetujui}
                triggerTolak={triggerTolak}
            />

            <hr style={{ margin: '20px 0' }} />

            <RiwayatApprovalTable
                approvalList={approvalList}
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

            {/* Modal Preview Detail (Menu Harian / RAB Harian) */}
            <ApprovalDetailModal
                detailModalOpen={detailModalOpen}
                detailType={detailType}
                detailLoading={detailLoading}
                detailData={detailData}
                bahanPokokMap={bahanPokokMap}
                closeDetailModal={closeDetailModal}
            />
        </div>
    );
};
