import React from 'react';
import { renderDate, renderStatus } from '../../ui/Table';

export const RabDetailView = ({ detailData }) => {
    return (
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
    );
};
