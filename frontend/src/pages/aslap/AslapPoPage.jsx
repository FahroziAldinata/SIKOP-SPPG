import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate } from '../../components/Table';
import Dropdown from '../../components/Dropdown';
import { Skeleton } from '../../components/Skeleton';

export const AslapPoPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [poList, setPoList] = useState([]);
    const [listLoading, setListLoading] = useState(false);

    // Detail & Approval States
    const [detailPoData, setDetailPoData] = useState(null);
    const [approvePoData, setApprovePoData] = useState(null);
    const [approveStep, setApproveStep] = useState(1);
    const [qtyDiterimaMap, setQtyDiterimaMap] = useState({});
    const [approveError, setApproveError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // PDF States
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfModalOpen, setPdfModalOpen] = useState(false);

    // Fetch periods on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setSelectedPeriodId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));
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

    // Open Approval Modal (2-Step)
    const openApproveModal = (po) => {
        setApprovePoData(po);
        setApproveStep(1);
        setApproveError('');
        const initialMap = {};
        (po.items || []).forEach(item => {
            const defaultQty = item.qtyRealisasi !== null && item.qtyRealisasi !== undefined
                ? item.qtyRealisasi
                : item.qty;
            initialMap[item.id] = String(defaultQty);
        });
        setQtyDiterimaMap(initialMap);
    };

    const handleNextStep = () => {
        setApproveError('');
        if (!approvePoData) return;

        for (const item of approvePoData.items || []) {
            const valStr = qtyDiterimaMap[item.id];
            const val = Number(valStr);
            if (valStr === undefined || valStr === '' || isNaN(val) || val < 0) {
                setApproveError(`Jumlah diterima untuk ${item.bahanPokok?.nama || 'item'} harus berupa angka non-negatif.`);
                return;
            }

            const maxAllowed = item.qtyRealisasi !== null && item.qtyRealisasi !== undefined
                ? Number(item.qtyRealisasi)
                : Number(item.qty);

            if (val > maxAllowed) {
                setApproveError(`Jumlah diterima untuk ${item.bahanPokok?.nama || 'item'} (${val}) tidak boleh melebihi realisasi (${maxAllowed}).`);
                return;
            }
        }

        setApproveStep(2);
    };

    const handleApprove = async () => {
        if (!approvePoData) return;
        setSubmitting(true);
        try {
            const itemsPayload = (approvePoData.items || []).map(item => ({
                itemId: item.id,
                qtyDiterima: Number(qtyDiterimaMap[item.id])
            }));

            const r = await request(`/aslap/po/${approvePoData.id}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsPayload })
            });

            if (r.ok) {
                toast.success('Penerimaan fisik barang berhasil disetujui (PO Diterima).');
                setApprovePoData(null);
                loadPoList(selectedPeriodId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal menyetujui PO' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error('Koneksi server gagal.');
        } finally {
            setSubmitting(false);
        }
    };

    // Fetch PDF Pemeriksaan Bahan Makanan
    const fetchPDF = async (poId) => {
        setPdfLoading(true);
        setPdfModalOpen(true);
        try {
            const r = await request(`/laporan/pemeriksaan-bahan/pdf?poId=${poId}`);
            if (r.ok) {
                const blob = await r.blob();
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal mengunduh dokumen' }));
                toast.error(d.error || 'Gagal mengunduh dokumen pemeriksaan bahan.');
                setPdfModalOpen(false);
            }
        } catch (err) {
            toast.error('Koneksi server gagal.');
            setPdfModalOpen(false);
        } finally {
            setPdfLoading(false);
        }
    };

    const closePdfModal = () => {
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
        setPdfModalOpen(false);
    };

    // Helper to get status styling
    const getStatusStyle = (status) => {
        switch (status) {
            case 'DITERIMA':
                return { backgroundColor: 'rgba(40, 167, 69, 0.1)', color: '#28a745', border: '1px solid rgba(40, 167, 69, 0.2)' };
            case 'DIREALISASI':
                return { backgroundColor: 'rgba(0, 123, 255, 0.1)', color: '#007bff', border: '1px solid rgba(0, 123, 255, 0.2)' };
            case 'DIAJUKAN':
            default:
                return { backgroundColor: 'rgba(253, 126, 20, 0.1)', color: '#fd7e14', border: '1px solid rgba(253, 126, 20, 0.2)' };
        }
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Pemeriksaan Fisik &amp; Verifikasi PO (Asisten Lapangan)</h2>
            
            {/* Filter Periode */}
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
                    Pilih Periode
                </label>
                <Dropdown
                    style={{ width: '100%' }}
                    value={selectedPeriodId}
                    onChange={setSelectedPeriodId}
                    options={periods.map(p => ({
                        value: p.id,
                        label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
                    }))}
                />
            </div>

            {/* Riwayat PO List */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Nota Pesanan (PO) &amp; Belanja</h3>
            {listLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}
            {!listLoading && <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal Pengiriman', render: (v) => renderDate(v) },
                    { key: 'supplier', header: 'Nama Supplier', render: (v) => v ? v.nama : '—' },
                    { key: 'items', header: 'Jumlah Item', align: 'right', render: (v) => `${(v || []).length} jenis bahan` },
                    {
                        key: 'totalNilai',
                        header: 'Total Nilai Rencana',
                        align: 'right',
                        render: (_, row) => {
                            const totalNilai = row.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
                            return (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    Rp{totalNilai.toLocaleString('id-ID')}
                                </span>
                            );
                        }
                    },
                    {
                        key: 'totalRealisasi',
                        header: 'Total Realisasi Mitra',
                        align: 'right',
                        render: (_, row) => {
                            if (row.status === 'DIAJUKAN') return <span style={{ color: 'var(--text-muted)' }}>Belum Belanja</span>;
                            const totalRealisasi = row.items.reduce((sum, item) => sum + Number(item.subtotalRealisasi || 0), 0);
                            return (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{totalRealisasi.toLocaleString('id-ID')}
                                </strong>
                            );
                        }
                    },
                    {
                        key: 'status',
                        header: 'Status',
                        align: 'center',
                        render: (v) => (
                            <span style={{
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                ...getStatusStyle(v)
                            }}>
                                {v}
                            </span>
                        )
                    },
                    {
                        key: 'aksi',
                        header: 'Aksi',
                        align: 'center',
                        width: '240px',
                        render: (_, row) => (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setDetailPoData(row)}
                                    style={{ padding: '4px 10px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}
                                >
                                    Detail
                                </button>
                                {row.status === 'DIREALISASI' && (
                                    <button
                                        onClick={() => openApproveModal(row)}
                                        style={{ padding: '4px 10px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        Verifikasi Fisik
                                    </button>
                                )}
                                {(row.status === 'DITERIMA' || row.status === 'DIREALISASI') && (
                                    <button
                                        onClick={() => fetchPDF(row.id)}
                                        style={{
                                            padding: '4px 10px',
                                            backgroundColor: '#007bff',
                                            color: '#fff',
                                            border: 'none',
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Cetak
                                    </button>
                                )}
                            </div>
                        )
                    }
                ]}
                data={poList}
                emptyText="Belum ada data Nota Pesanan (PO) untuk periode ini."
            />}

            {/* Modal Detail PO */}
            {detailPoData && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        width: '100%',
                        maxWidth: '850px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        overflowX: 'auto',
                        padding: '24px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-hover)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Detail PO - Tanggal {renderDate(detailPoData.tanggal)}</span>
                            <span style={{
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                ...getStatusStyle(detailPoData.status)
                            }}>{detailPoData.status}</span>
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '13px' }}>
                            <div>Supplier: <strong>{detailPoData.supplier?.nama}</strong></div>
                            <div>Catatan: {detailPoData.catatan || '—'}</div>
                            {detailPoData.diterimaAt && (
                                <div style={{ gridColumn: 'span 2' }}>
                                    Diterima oleh: <strong>{detailPoData.diterimaOleh?.nama}</strong> pada {renderDate(detailPoData.diterimaAt)}
                                </div>
                            )}
                        </div>

                        <Table
                            columns={[
                                { key: 'nama', header: 'Bahan Pokok', render: (_, r) => r.bahanPokok?.nama },
                                { key: 'satuan', header: 'Satuan', align: 'center', render: (_, r) => r.bahanPokok?.satuan },
                                { key: 'qty', header: 'Qty Diminta', align: 'right', render: (v) => Number(v).toLocaleString('id-ID') },
                                { key: 'hargaSatuan', header: 'Harga Diminta', align: 'right', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` },
                                { key: 'subtotal', header: 'Subtotal Diminta', align: 'right', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` },
                                { 
                                    key: 'qtyRealisasi', 
                                    header: 'Qty Realisasi', 
                                    align: 'right', 
                                    render: (v) => v !== null ? Number(v).toLocaleString('id-ID') : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                },
                                { 
                                    key: 'hargaSatuanRealisasi', 
                                    header: 'Harga Realisasi', 
                                    align: 'right', 
                                    render: (v) => v !== null ? `Rp${Number(v).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                },
                                { 
                                    key: 'subtotalRealisasi', 
                                    header: 'Subtotal Realisasi', 
                                    align: 'right', 
                                    render: (v) => v !== null ? `Rp${Number(v).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                },
                                {
                                    key: 'qtyDiterima',
                                    header: 'Qty Diterima',
                                    align: 'right',
                                    render: (v) => v !== null && v !== undefined ? Number(v).toLocaleString('id-ID') : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                }
                            ]}
                            data={detailPoData.items}
                        />

                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setDetailPoData(null)}
                                style={{ padding: '8px 16px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Approval Confirmation 2-Langkah */}
            {approvePoData && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        width: '100%',
                        maxWidth: '650px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '24px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-hover)'
                    }}>
                        <h3 style={{ margin: '0 0 4px 0' }}>Persetujuan Penerimaan Fisik Barang</h3>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Langkah {approveStep} dari 2 — {approveStep === 1 ? 'Input Qty Diterima per Item' : 'Konfirmasi Penerimaan'}
                        </div>

                        {approveError && (
                            <div style={{
                                padding: '10px 14px',
                                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                color: '#dc3545',
                                border: '1px solid rgba(220, 53, 69, 0.2)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px',
                                marginBottom: '15px'
                            }}>
                                {approveError}
                            </div>
                        )}

                        {approveStep === 1 ? (
                            <>
                                <p style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '15px' }}>
                                    Periksa fisik barang dari Supplier <strong>{approvePoData.supplier?.nama}</strong> (Pengiriman {renderDate(approvePoData.tanggal)}). Masukkan jumlah barang yang diterima:
                                </p>

                                <Table
                                    columns={[
                                        { key: 'nama', header: 'Bahan Pokok', render: (_, r) => r.bahanPokok?.nama },
                                        { key: 'satuan', header: 'Satuan', align: 'center', render: (_, r) => r.bahanPokok?.satuan },
                                        { 
                                            key: 'qtyMax', 
                                            header: 'Qty Realisasi', 
                                            align: 'right', 
                                            render: (_, r) => {
                                                const maxVal = r.qtyRealisasi !== null && r.qtyRealisasi !== undefined ? r.qtyRealisasi : r.qty;
                                                return Number(maxVal).toLocaleString('id-ID');
                                            }
                                        },
                                        {
                                            key: 'qtyDiterima',
                                            header: 'Qty Diterima',
                                            align: 'right',
                                            width: '140px',
                                            render: (_, r) => {
                                                const maxVal = r.qtyRealisasi !== null && r.qtyRealisasi !== undefined ? Number(r.qtyRealisasi) : Number(r.qty);
                                                return (
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0"
                                                        max={maxVal}
                                                        value={qtyDiterimaMap[r.id] ?? ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setQtyDiterimaMap(prev => ({ ...prev, [r.id]: val }));
                                                        }}
                                                        style={{
                                                            width: '110px',
                                                            padding: '4px 8px',
                                                            borderRadius: 'var(--radius-sm)',
                                                            border: '1px solid var(--border)',
                                                            textAlign: 'right',
                                                            backgroundColor: 'var(--bg)',
                                                            color: 'var(--text)'
                                                        }}
                                                    />
                                                );
                                            }
                                        }
                                    ]}
                                    data={approvePoData.items || []}
                                />

                                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button
                                        onClick={() => setApprovePoData(null)}
                                        style={{ padding: '8px 16px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleNextStep}
                                        style={{ padding: '8px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}
                                    >
                                        Lanjut ke Konfirmasi &rarr;
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '15px' }}>
                                    Harap konfirmasi rincian penerimaan barang dari Supplier <strong>{approvePoData.supplier?.nama}</strong>:
                                </p>

                                <div style={{ marginBottom: '15px' }}>
                                    <Table
                                        columns={[
                                            { key: 'nama', header: 'Bahan Pokok', render: (_, r) => r.bahanPokok?.nama },
                                            { key: 'satuan', header: 'Satuan', align: 'center', render: (_, r) => r.bahanPokok?.satuan },
                                            {
                                                key: 'qtyRealisasi',
                                                header: 'Qty Realisasi',
                                                align: 'right',
                                                render: (_, r) => {
                                                    const maxVal = r.qtyRealisasi !== null && r.qtyRealisasi !== undefined ? r.qtyRealisasi : r.qty;
                                                    return Number(maxVal).toLocaleString('id-ID');
                                                }
                                            },
                                            {
                                                key: 'qtyDiterima',
                                                header: 'Qty Diterima',
                                                align: 'right',
                                                render: (_, r) => (
                                                    <strong style={{ color: '#28a745' }}>
                                                        {Number(qtyDiterimaMap[r.id] || 0).toLocaleString('id-ID')}
                                                    </strong>
                                                )
                                            }
                                        ]}
                                        data={approvePoData.items || []}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button
                                        onClick={() => setApproveStep(1)}
                                        disabled={submitting}
                                        style={{ padding: '8px 16px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                    >
                                        &larr; Kembali
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        disabled={submitting}
                                        style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}
                                    >
                                        {submitting ? 'Memproses...' : 'Konfirmasi Terima'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* PDF Preview Modal — Pemeriksaan Bahan Makanan */}
            {pdfModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '24px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-hover)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0' }}>Dokumen Pemeriksaan Bahan Makanan</h3>

                        {pdfLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                <Skeleton height="560px" />
                            </div>
                        ) : (
                            <iframe
                                src={pdfUrl}
                                style={{ width: '100%', flex: 1, minHeight: '560px', border: 'none', borderRadius: 'var(--radius-sm)' }}
                                title="Pemeriksaan Bahan Makanan"
                            />
                        )}

                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            {pdfUrl && (
                                <a
                                    href={pdfUrl}
                                    download="PemeriksaanBahanMakanan.pdf"
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#007bff',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '13px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Unduh PDF
                                </a>
                            )}
                            <button
                                onClick={closePdfModal}
                                style={{ padding: '8px 16px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
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
