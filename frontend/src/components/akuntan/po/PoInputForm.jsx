import React from 'react';
import { DatePicker } from '../../DatePicker';
import Dropdown from '../../Dropdown';
import { Skeleton } from '../../Skeleton';
import { Table } from '../../Table';
import { NumberInput } from '../../NumberInput';

export const PoInputForm = ({
    handleCreatePo,
    poDate,
    setPoDate,
    activePeriod,
    supplierId,
    setSupplierId,
    suppliers,
    setIsAddSupplierOpen,
    menuDescription,
    loading,
    kebutuhanHitungan,
    rabNotApproved,
    poItems,
    handleItemChange,
    catatan,
    setCatatan,
}) => {
    return (
        <form onSubmit={handleCreatePo} style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '30px'
        }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                Inisiasi Nota Pesanan (PO) Baru
            </h3>

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
                        Tanggal Pengiriman
                    </label>
                    <DatePicker
                        value={poDate}
                        onChange={setPoDate}
                        defaultFocusMonth={activePeriod?.tanggalMulai}
                        required
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
                        Pilih Supplier / CV
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Dropdown
                            style={{ flex: 1 }}
                            value={supplierId}
                            onChange={setSupplierId}
                            options={suppliers.map(s => ({
                                value: s.id,
                                label: s.nama
                            }))}
                        />
                        <button
                            type="button"
                            onClick={() => setIsAddSupplierOpen(true)}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--btn-primary-bg)',
                                color: 'var(--btn-primary-text)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '13px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            + Baru
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Menu Harian */}
            {poDate && (
                <div style={{ border: '1px dashed var(--border)', padding: '10px', backgroundColor: 'var(--bg)', fontSize: '14px', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}>
                    <strong>Rencana Menu Hari Ini:</strong> {menuDescription}
                </div>
            )}

            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '15px 0' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}

            {/* Referensi Konversi Satuan */}
            {!loading && kebutuhanHitungan.length > 0 && (
                <div style={{
                    border: '1px solid var(--color-primary-light)',
                    backgroundColor: 'rgba(181, 224, 234, 0.15)',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '10px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>
                        📌 Referensi Konversi Satuan (Hitungan &rarr; KG)
                    </h4>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {kebutuhanHitungan.map((item) => (
                            <div key={item.bahanPokokId} style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border)',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px',
                                color: 'var(--text)'
                            }}>
                                <strong>{item.nama}</strong>: {item.permintaanAG.toLocaleString('id-ID')} {item.satuanHitungan} &rarr; <strong>{item.final}</strong> KG <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(konversi {item.konversiPerKg}/kg)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Banner Warning RAB Belum Disetujui */}
            {rabNotApproved && (
                <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'rgba(253, 126, 20, 0.1)',
                    border: '1px solid #fd7e14',
                    borderRadius: 'var(--radius-md)',
                    color: '#fd7e14',
                    marginBottom: '16px',
                    fontWeight: 600,
                    fontSize: '14px'
                }}>
                    ⚠️ {rabNotApproved}
                </div>
            )}

            {/* Table Items Kebutuhan */}
            {!loading && poItems.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>Daftar Kebutuhan Bahan Makanan (Berdasarkan Porsi PM &amp; Menu)</h4>
                    <Table
                        columns={[
                            { key: 'nama', header: 'Nama Bahan' },
                            { key: 'satuan', header: 'Satuan', align: 'center' },
                            {
                                key: 'qtySiswa',
                                header: 'Alokasi Siswa',
                                align: 'right',
                                render: (v) => (
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {Number(v).toLocaleString('id-ID')}
                                    </span>
                                )
                            },
                            {
                                key: 'qtyB3',
                                header: 'Alokasi B3',
                                align: 'right',
                                render: (v) => (
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {Number(v).toLocaleString('id-ID')}
                                    </span>
                                )
                            },
                            {
                                key: 'qtyTotal',
                                header: 'Total Qty',
                                width: '120px',
                                align: 'right',
                                render: (v, row, idx) => (
                                    <input
                                        type="number"
                                        step="0.001"
                                        className="form-field"
                                        style={{ textAlign: 'right' }}
                                        value={v}
                                        onChange={e => handleItemChange(idx, 'qtyTotal', e.target.value)}
                                        required
                                    />
                                )
                            },
                            {
                                key: 'hargaSatuan',
                                header: 'Harga Satuan (Rp)',
                                width: '140px',
                                align: 'right',
                                render: (v, row, idx) => (
                                    <NumberInput
                                        className="form-field"
                                        style={{ textAlign: 'right' }}
                                        value={v === '' ? '' : Number(v)}
                                        onChange={val => handleItemChange(idx, 'hargaSatuan', val)}
                                        required
                                    />
                                )
                            },
                            {
                                key: 'subtotal',
                                header: 'Subtotal (Rp)',
                                align: 'right',
                                render: (v) => (
                                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        Rp{Number(v).toLocaleString('id-ID')}
                                    </strong>
                                )
                            }
                        ]}
                        data={poItems}
                    />
                </div>
            )}

            {poDate && poItems.length === 0 && !loading && (
                <div style={{ color: 'var(--color-warning)', padding: '10px', border: '1px solid rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-sm)' }}>
                    Tidak ada rencana menu harian aktif / disetujui untuk tanggal terpilih.
                </div>
            )}

            <div>
                <label style={{
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '6px'
                }}>
                    Catatan Tambahan (opsional)
                </label>
                <input
                    type="text"
                    className="form-field"
                    placeholder="Contoh: Pengiriman pagi s.d jam 06.00"
                    value={catatan}
                    onChange={e => setCatatan(e.target.value)}
                />
            </div>

            <div style={{ marginTop: '10px' }}>
                <button
                    type="submit"
                    disabled={poItems.length === 0 || rabNotApproved !== null}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: (poItems.length === 0 || rabNotApproved !== null) ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: '14px',
                        opacity: (poItems.length === 0 || rabNotApproved !== null) ? 0.5 : 1
                    }}
                >
                    Inisiasi Nota Pesanan
                </button>
            </div>
        </form>
    );
};
