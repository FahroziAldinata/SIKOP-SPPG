import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { renderDate } from '../../components/Table';
import { Card } from '../../components/Card';

import {
    cleanDateStr,
    getDatesInRange,
    getStatusStyle,
} from '../../components/akuntan/po/statusStyles';
import { PrintPoGabunganDocument } from '../../components/akuntan/po/PrintPoGabunganDocument';
import { PrintPoDocument } from '../../components/akuntan/po/PrintPoDocument';
import { PoFilterPeriode } from '../../components/akuntan/po/PoFilterPeriode';
import { PoInputForm } from '../../components/akuntan/po/PoInputForm';
import { PoRiwayatList } from '../../components/akuntan/po/PoRiwayatList';
import { DetailPoModal } from '../../components/akuntan/po/DetailPoModal';
import { AddSupplierModal } from '../../components/akuntan/po/AddSupplierModal';
import { MultiPrintModal } from '../../components/akuntan/po/MultiPrintModal';
import { PoPdfPreviewModal } from '../../components/akuntan/po/PoPdfPreviewModal';

export const AkuntanPoPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [suppliers, setSuppliers] = useState([]);
    const [supplierId, setSupplierId] = useState('');
    const [poDate, setPoDate] = useState('');
    const [catatan, setCatatan] = useState('');

    const [menuDescription, setMenuDescription] = useState('');
    const [poItems, setPoItems] = useState([]);
    const [poList, setPoList] = useState([]);
    const [kebutuhanHitungan, setKebutuhanHitungan] = useState([]);
    const [rabNotApproved, setRabNotApproved] = useState(null);

    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    
    // Print State
    const [isPrinting, setIsPrinting] = useState(false);
    const [printPoData, setPrintPoData] = useState(null);
    const [detailPoData, setDetailPoData] = useState(null);
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ nama: '', kontak: '' });
    const [supplierSubmitting, setSupplierSubmitting] = useState(false);

    // PDF States
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfModalTitle, setPdfModalTitle] = useState('Nota Pesanan');

    useEffect(() => {
        if (!pdfUrl) return;
        const timer = setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
        }, 30000);
        return () => {
            clearTimeout(timer);
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    const fetchPoPdf = async (poId, supplierNama) => {
        setPdfLoading(true);
        setPdfModalTitle(supplierNama ? `Nota Pesanan — ${supplierNama}` : 'Nota Pesanan');
        setIsPdfModalOpen(true);
        try {
            const r = await request(`/mitra/po/${poId}/pdf`);
            if (r.ok) {
                const blob = await r.blob();
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal mengunduh PDF Nota Pesanan' }));
                toast.error(d.error || 'Gagal mengunduh PDF Nota Pesanan.');
                setIsPdfModalOpen(false);
            }
        } catch (err) {
            toast.error('Koneksi server gagal.');
            setIsPdfModalOpen(false);
        } finally {
            setPdfLoading(false);
        }
    };

    const closePdfModal = () => {
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
        setIsPdfModalOpen(false);
    };

    // ponytail: Cetak PO Gabungan states & helpers
    const [selectedTanggalMulti, setSelectedTanggalMulti] = useState([]);
    const [isMultiPrintModalOpen, setIsMultiPrintModalOpen] = useState(false);
    const [printGabunganData, setPrintGabunganData] = useState(null);
    const [nomorDokumenGabungan, setNomorDokumenGabungan] = useState('');

    // Fetch master data on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setSelectedPeriodId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));

        request('/akuntan/supplier')
            .then(r => r.json())
            .then(d => {
                setSuppliers(d);
                if (d.length) setSupplierId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar supplier.'));
    }, []);

    // Load PO list when period changes
    const loadPoList = async (pid) => {
        if (!pid) return;
        setListLoading(true);
        try {
            const r = await request(`/mitra/po/list?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setPoList(resJson.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        if (selectedPeriodId) {
            loadPoList(selectedPeriodId);
        }
    }, [selectedPeriodId]);

    // Load ingredient requirements when date changes
    useEffect(() => {
        if (!poDate || !selectedPeriodId) {
            setPoItems([]);
            setMenuDescription('');
            setKebutuhanHitungan([]);
            setRabNotApproved(null);
            return;
        }

        const fetchKebutuhan = async () => {
            setLoading(true);
            try {
                const [r1, r2] = await Promise.all([
                    request(`/mitra/po/kebutuhan?tanggal=${poDate}&periodeId=${selectedPeriodId}`),
                    request(`/akuntan/kebutuhan-hitungan?periodeId=${selectedPeriodId}&tanggal=${poDate}`)
                ]);

                if (r1.ok) {
                    const data = await r1.json();
                    if (data.success === false && data.error) {
                        setRabNotApproved(data.error);
                        setPoItems([]);
                        setMenuDescription('');
                    } else {
                        setRabNotApproved(null);
                        setMenuDescription(data.menuDescription || '—');
                        setPoItems(data.ingredients || []);
                    }
                } else {
                    const errData = await r1.json().catch(() => ({ error: 'Gagal memuat kebutuhan bahan.' }));
                    if (errData.error) {
                        setRabNotApproved(errData.error);
                    } else {
                        toast.error(errData.error);
                    }
                    setPoItems([]);
                    setMenuDescription('');
                }

                if (r2.ok) {
                    const hitunganData = await r2.json();
                    if (hitunganData.success === false && hitunganData.error) {
                        setRabNotApproved(hitunganData.error);
                        setKebutuhanHitungan([]);
                    } else {
                        setKebutuhanHitungan(hitunganData.data || []);
                    }
                } else {
                    setKebutuhanHitungan([]);
                }
            } catch (err) {
                toast.error('Koneksi server gagal.');
            } finally {
                setLoading(false);
            }
        };

        fetchKebutuhan();
    }, [poDate, selectedPeriodId]);

    // Update Qty or Price manually in the form
    const handleItemChange = (idx, field, val) => {
        const parsed = parseFloat(val) || 0;
        setPoItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [field]: val };
            const q = field === 'qtyTotal' ? parsed : parseFloat(item.qtyTotal) || 0;
            const p = field === 'hargaSatuan' ? parsed : parseFloat(item.hargaSatuan) || 0;
            updated.subtotal = Math.round((q * p) * 100) / 100;
            return updated;
        }));
    };

    const handleCreatePo = async (e) => {
        e.preventDefault();
        if (!selectedPeriodId) return toast.error('Periode wajib dipilih.');
        if (!poDate) return toast.error('Tanggal wajib diisi.');
        if (!supplierId) return toast.error('Supplier wajib dipilih.');
        if (poItems.length === 0) return toast.error('Tidak ada item PO yang tersedia untuk tanggal ini.');

        const itemsPayload = poItems.map(item => ({
            bahanPokokId: item.bahanPokokId,
            qtyTotal: parseFloat(item.qtyTotal) || 0,
            hargaSatuan: parseFloat(item.hargaSatuan) || 0
        }));

        try {
            const r = await request('/akuntan/po', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodeId: selectedPeriodId,
                    tanggal: poDate,
                    supplierId,
                    items: itemsPayload,
                    catatan
                })
            });

            if (r.ok) {
                toast.success('Nota Pesanan (PO) berhasil diinisiasi.');
                setPoDate('');
                setCatatan('');
                setPoItems([]);
                setMenuDescription('');
                loadPoList(selectedPeriodId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan server saat menyimpan PO' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error('Terjadi kesalahan koneksi.');
        }
    };

    const handleAddSupplier = async (e) => {
        e.preventDefault();
        if (!newSupplier.nama) {
            return toast.error('Nama supplier wajib diisi.');
        }
        setSupplierSubmitting(true);
        try {
            const r = await request('/akuntan/supplier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSupplier)
            });
            if (r.ok) {
                const data = await r.json();
                toast.success('Supplier baru berhasil ditambahkan.');
                const res = await request('/akuntan/supplier');
                if (res.ok) {
                    const list = await res.json();
                    setSuppliers(list);
                    setSupplierId(data.id);
                }
                setNewSupplier({ nama: '', kontak: '' });
                setIsAddSupplierOpen(false);
            } else {
                const errData = await r.json().catch(() => ({ error: 'Gagal menambahkan supplier.' }));
                toast.error(errData.error);
            }
        } catch (err) {
            toast.error('Terjadi kesalahan koneksi.');
        } finally {
            setSupplierSubmitting(false);
        }
    };

    // Prepare active period & SPPG info for print layout
    const activePeriod = periods.find(p => p.id === selectedPeriodId);
    const namaLembaga = activePeriod?.setupLembaga?.namaLembaga || 'SPPG SUMEDANG UJUNGJAYA PALABUAN';
    const idLembaga = activePeriod?.setupLembaga?.id || 'ZEZ3TM0G';
    const ketuaYayasan = activePeriod?.setupLembaga?.ketuaYayasan || 'Dizhar Priatama';

    if (isPrinting && printGabunganData) {
        return (
            <PrintPoGabunganDocument
                isPrinting={isPrinting}
                printGabunganData={printGabunganData}
                nomorDokumenGabungan={nomorDokumenGabungan}
                namaLembaga={namaLembaga}
                idLembaga={idLembaga}
                activePeriod={activePeriod}
                setIsPrinting={setIsPrinting}
                setPrintGabunganData={setPrintGabunganData}
            />
        );
    }

    if (isPrinting && printPoData) {
        return (
            <PrintPoDocument
                isPrinting={isPrinting}
                printPoData={printPoData}
                activePeriod={activePeriod}
                namaLembaga={namaLembaga}
                idLembaga={idLembaga}
                setIsPrinting={setIsPrinting}
                setPrintPoData={setPrintPoData}
            />
        );
    }

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Nota Pesanan (PO) &amp; Realisasi Belanja (Akuntan)</h2>
            
            <PoFilterPeriode
                periods={periods}
                selectedPeriodId={selectedPeriodId}
                setSelectedPeriodId={setSelectedPeriodId}
                setSelectedTanggalMulti={setSelectedTanggalMulti}
                setIsMultiPrintModalOpen={setIsMultiPrintModalOpen}
            />

            <PoInputForm
                handleCreatePo={handleCreatePo}
                poDate={poDate}
                setPoDate={setPoDate}
                activePeriod={activePeriod}
                supplierId={supplierId}
                setSupplierId={setSupplierId}
                suppliers={suppliers}
                setIsAddSupplierOpen={setIsAddSupplierOpen}
                menuDescription={menuDescription}
                loading={loading}
                kebutuhanHitungan={kebutuhanHitungan}
                rabNotApproved={rabNotApproved}
                poItems={poItems}
                handleItemChange={handleItemChange}
                catatan={catatan}
                setCatatan={setCatatan}
            />

            <PoRiwayatList
                listLoading={listLoading}
                poList={poList}
                renderDate={renderDate}
                getStatusStyle={getStatusStyle}
                setDetailPoData={setDetailPoData}
                setPrintPoData={setPrintPoData}
                setIsPrinting={setIsPrinting}
                fetchPoPdf={fetchPoPdf}
            />

            <DetailPoModal
                detailPoData={detailPoData}
                setDetailPoData={setDetailPoData}
                fetchPoPdf={fetchPoPdf}
                renderDate={renderDate}
                getStatusStyle={getStatusStyle}
            />

            <AddSupplierModal
                isAddSupplierOpen={isAddSupplierOpen}
                newSupplier={newSupplier}
                setNewSupplier={setNewSupplier}
                handleAddSupplier={handleAddSupplier}
                supplierSubmitting={supplierSubmitting}
                setIsAddSupplierOpen={setIsAddSupplierOpen}
            />

            <MultiPrintModal
                isMultiPrintModalOpen={isMultiPrintModalOpen}
                selectedTanggalMulti={selectedTanggalMulti}
                setSelectedTanggalMulti={setSelectedTanggalMulti}
                nomorDokumenGabungan={nomorDokumenGabungan}
                setNomorDokumenGabungan={setNomorDokumenGabungan}
                periods={periods}
                selectedPeriodId={selectedPeriodId}
                renderDate={renderDate}
                request={request}
                toast={toast}
                setPrintGabunganData={setPrintGabunganData}
                setIsPrinting={setIsPrinting}
                setIsMultiPrintModalOpen={setIsMultiPrintModalOpen}
                getDatesInRange={getDatesInRange}
                cleanDateStr={cleanDateStr}
            />

            <PoPdfPreviewModal
                isPdfModalOpen={isPdfModalOpen}
                pdfModalTitle={pdfModalTitle}
                pdfUrl={pdfUrl}
                pdfLoading={pdfLoading}
                closePdfModal={closePdfModal}
            />
        </div>
    );
};
