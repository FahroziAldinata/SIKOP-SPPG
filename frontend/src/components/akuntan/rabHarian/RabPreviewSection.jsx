import React from 'react';
import { DatePicker } from '../../DatePicker';
import { Skeleton } from '../../Skeleton';
import { Table, renderCurrency } from '../../Table';
import { NumberInput } from '../../NumberInput';

export const RabPreviewSection = ({
    tanggalInput,
    setTanggalInput,
    activePeriod,
    previewLoading,
    rabPreview,
    rabP12Harian,
    rabItems,
    handlePriceChange,
    handleSaveRab,
    isSaving
}) => {
    return (
        <div style={{
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
            padding: '24px', backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)', marginBottom: '20px'
        }}>
            <div style={{
                display: 'flex', gap: '15px', alignItems: 'flex-end',
                maxWidth: '640px', flexWrap: 'wrap', marginBottom: '20px'
            }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{
                        textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                        letterSpacing: '0.07em', color: 'var(--text-muted)',
                        display: 'block', marginBottom: '6px'
                    }}>
                        Pilih Tanggal RAB
                    </label>
                    <DatePicker
                        value={tanggalInput}
                        onChange={setTanggalInput}
                        defaultFocusMonth={activePeriod?.tanggalMulai}
                        required
                    />
                </div>
            </div>

            {/* Preview content */}
            {previewLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} height="40px" />)}
                </div>
            )}

            {tanggalInput && !previewLoading && rabPreview && !rabPreview.tersedia && (
                <div style={{
                    padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text)'
                }}>
                    ⚠️ {rabPreview.pesan || 'Menu Harian untuk tanggal ini belum disetujui Kepala SPPG.'}
                </div>
            )}

            {tanggalInput && !previewLoading && rabPreview && rabPreview.tersedia && (
                <div>
                    {/* Menu & Pagu Info (merged dengan rabP12Harian) */}
                    <div style={{
                        backgroundColor: 'var(--bg)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '16px', marginBottom: '20px',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text)' }}>
                            <div>
                                Menu:{' '}
                                <strong>{rabPreview.menu?.join(', ') || '—'}</strong>
                            </div>
                            <div>
                                Porsi:{' '}
                                <strong>{rabPreview.porsi?.KECIL ?? 0} Kecil</strong> +{' '}
                                <strong>{rabPreview.porsi?.BESAR ?? 0} Besar</strong>
                            </div>
                            <div>
                                Pagu:{' '}
                                <strong style={{ color: 'var(--color-primary)' }}>
                                    Rp {renderCurrency(rabPreview.pagu?.total, false)}
                                </strong>
                            </div>
                            {rabP12Harian && (
                                <>
                                    <div style={{ color: 'var(--border)' }}>|</div>
                                    <div>Pagu Kecil: <strong>Rp {renderCurrency(rabP12Harian.pagu?.KECIL, false)}</strong></div>
                                    <div>Pagu Besar: <strong>Rp {renderCurrency(rabP12Harian.pagu?.BESAR, false)}</strong></div>
                                    <div>Total Pagu: <strong style={{ color: 'var(--color-primary)' }}>Rp {renderCurrency(rabP12Harian.pagu?.total, false)}</strong></div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tabel SISWA */}
                    {(() => {
                        const siswaItems = rabItems.filter(i => i.qtySiswa > 0);
                        if (siswaItems.length === 0) return null;
                        const sumSiswa = siswaItems.reduce((s, i) => s + i.subtotal, 0);
                        return (
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                                    SISWA — Subtotal Rp {renderCurrency(sumSiswa, false)}
                                </h4>
                                <Table
                                    columns={[
                                        { key: 'nama', header: 'Bahan' },
                                        { key: 'qtySiswa', header: 'Qty', align: 'right', render: (v) => `${Number(v).toLocaleString('id-ID')} kg` },
                                        {
                                            key: 'hargaSatuan',
                                            header: 'Harga (Rp)',
                                            align: 'right',
                                            render: (v, row) => (
                                                <NumberInput
                                                    value={row._hargaInput}
                                                    onChange={val => handlePriceChange(row.bahanPokokId, val)}
                                                    style={{ width: '100px', textAlign: 'right', fontSize: '12px' }}
                                                    placeholder="0"
                                                />
                                            )
                                        },
                                        { key: 'subtotal', header: 'Jumlah', align: 'right', render: (v) => <strong>Rp {renderCurrency(v, false)}</strong> }
                                    ]}
                                    data={siswaItems}
                                />
                            </div>
                        );
                    })()}

                    {/* Tabel B3 */}
                    {(() => {
                        const b3Items = rabItems.filter(i => i.qtyB3 > 0);
                        if (b3Items.length === 0) return null;
                        const sumB3 = b3Items.reduce((s, i) => s + i.subtotal, 0);
                        return (
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                                    B3 — Subtotal Rp {renderCurrency(sumB3, false)}
                                </h4>
                                <Table
                                    columns={[
                                        { key: 'nama', header: 'Bahan' },
                                        { key: 'qtyB3', header: 'Qty', align: 'right', render: (v) => `${Number(v).toLocaleString('id-ID')} kg` },
                                        {
                                            key: 'hargaSatuan',
                                            header: 'Harga (Rp)',
                                            align: 'right',
                                            render: (v, row) => (
                                                <NumberInput
                                                    value={row._hargaInput}
                                                    onChange={val => handlePriceChange(row.bahanPokokId, val)}
                                                    style={{ width: '100px', textAlign: 'right', fontSize: '12px' }}
                                                    placeholder="0"
                                                />
                                            )
                                        },
                                        { key: 'subtotal', header: 'Jumlah', align: 'right', render: (v) => <strong>Rp {renderCurrency(v, false)}</strong> }
                                    ]}
                                    data={b3Items}
                                />
                            </div>
                        );
                    })()}

                    {/* Tabel bahan campuran (SISWA+B3, qty sama kedua jalur) — skip karena sudah tercakup di atas */}

                    {/* Summary Bar */}
                    {(() => {
                        const total = rabItems.reduce((s, i) => s + i.subtotal, 0);
                        const pagu = rabPreview.pagu?.total || 0;
                        const sisa = Math.round((pagu - total) * 100) / 100;
                        const isOver = sisa < 0;
                        return (
                            <div style={{
                                display: 'flex', gap: '24px', alignItems: 'center',
                                padding: '12px 16px', backgroundColor: isOver ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                                borderRadius: 'var(--radius-sm)', border: `1px solid ${isOver ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)'}`,
                                fontSize: '14px', fontWeight: 600, color: 'var(--text)'
                            }}>
                                <span>Total: <strong>Rp {renderCurrency(total, false)}</strong></span>
                                <span>Pagu: <strong>Rp {renderCurrency(pagu, false)}</strong></span>
                                <span>Sisa:{' '}
                                    <strong style={{ color: isOver ? 'var(--color-danger, #ef4444)' : 'var(--color-success, #22c55e)' }}>
                                        Rp {renderCurrency(sisa, false)}
                                    </strong>
                                </span>
                            </div>
                        );
                    })()}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button onClick={handleSaveRab} disabled={isSaving} style={{
                            padding: '10px 24px', backgroundColor: 'var(--btn-primary-bg)',
                            color: 'var(--btn-primary-text)', border: 'none',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            fontWeight: 600, fontSize: '14px'
                        }}>
                            {isSaving ? 'Menyimpan...' : 'Simpan RAB'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
