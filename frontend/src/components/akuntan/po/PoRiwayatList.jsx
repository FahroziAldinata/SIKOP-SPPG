import React from 'react';
import { Skeleton } from '../../Skeleton';
import { getStatusStyle } from './statusStyles';

export const PoRiwayatList = ({
    listLoading,
    poList,
    renderDate,
    setDetailPoData,
    setPrintPoData,
    setIsPrinting,
    fetchPoPdf,
}) => {
    return (
        <>
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Riwayat Nota Pesanan (PO) Terdaftar</h3>
            {listLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}
            {!listLoading && poList.length === 0 && (
                <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                    Belum ada data Nota Pesanan (PO) untuk periode ini.
                </div>
            )}
            {!listLoading && poList.length > 0 && (() => {
                const groups = {};
                for (const po of poList) {
                    const key = `${po.tanggal}||${po.supplier?.id}`;
                    if (!groups[key]) {
                        groups[key] = { tanggal: po.tanggal, supplier: po.supplier, ros: [] };
                    }
                    groups[key].ros.push(po);
                }
                const sorted = Object.values(groups).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
                return sorted.map(group => {
                    const totalNilai = group.ros.reduce((s, po) => s + po.items.reduce((ss, i) => ss + Number(i.subtotal), 0), 0);
                    const totalRealisasi = group.ros.reduce((s, po) => s + po.items.reduce((ss, i) => ss + Number(i.subtotalRealisasi || 0), 0), 0);
                    const isAnyRealized = group.ros.some(po => po.status !== 'DIAJUKAN');
                    const allStatuses = [...new Set(group.ros.map(po => po.status))];
                    return (
                        <div key={group.tanggal + group.supplier?.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '20px', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                                <div>
                                    <strong style={{ fontSize: '15px' }}>{renderDate(group.tanggal)}</strong>
                                    <span style={{ color: 'var(--text-muted)', margin: '0 10px' }}>—</span>
                                    <span>{group.supplier?.nama || '—'}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '15px', fontSize: '13px' }}>
                                    <span>PO: <strong>{group.ros.length}</strong></span>
                                    <span>Nilai: <strong>Rp{totalNilai.toLocaleString('id-ID')}</strong></span>
                                    {isAnyRealized && <span>Realisasi: <strong>Rp{totalRealisasi.toLocaleString('id-ID')}</strong></span>}
                                    <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {allStatuses.map(st => (
                                            <span key={st} style={{ ...getStatusStyle(st), padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 'bold' }}>{st}</span>
                                        ))}
                                    </span>
                                </div>
                            </div>
                            <div style={{ padding: '10px 20px 20px' }}>
                                {group.ros.map(po => (
                                    <div key={po.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: '10px', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', backgroundColor: 'var(--bg)', fontSize: '12px', borderBottom: '1px solid var(--border)' }}>
                                            <span>#{po.id.slice(-6)} — {po.catatan || 'tanpa catatan'}</span>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => setDetailPoData(po)} style={{ padding: '3px 8px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>Detail</button>
                                                <button onClick={() => { setPrintPoData(po); setIsPrinting(true); }} style={{ padding: '3px 8px', backgroundColor: '#6c757d', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>Cetak (Print)</button>
                                                <button onClick={() => fetchPoPdf(po.id, po.supplier?.nama)} style={{ padding: '3px 8px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 'bold' }}>Cetak PDF</button>
                                            </div>
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f9f9f9', color: 'var(--text-muted)' }}>
                                                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Bahan</th>
                                                    <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Sat</th>
                                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Qty</th>
                                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Harga</th>
                                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Subtotal</th>
                                                    {isAnyRealized && <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Qty Real</th>}
                                                    {isAnyRealized && <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Subtotal Real</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {po.items.map(item => (
                                                    <tr key={item.id}>
                                                        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)' }}>{item.bahanPokok?.nama}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{item.bahanPokok?.satuan}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>{Number(item.qty).toLocaleString('id-ID')}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>Rp{Number(item.hargaSatuan).toLocaleString('id-ID')}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>Rp{Number(item.subtotal).toLocaleString('id-ID')}</td>
                                                        {isAnyRealized && (
                                                            <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                                                                {item.qtyRealisasi !== null ? Number(item.qtyRealisasi).toLocaleString('id-ID') : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                            </td>
                                                        )}
                                                        {isAnyRealized && (
                                                            <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                                                                {item.subtotalRealisasi !== null ? `Rp${Number(item.subtotalRealisasi).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                });
            })()}
        </>
    );
};
