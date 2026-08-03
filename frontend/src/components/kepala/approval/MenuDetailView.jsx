import React from 'react';
import { renderDate, renderStatus } from '../../ui/Table';
import { calculateBlockGizi, KOMPONEN_LABEL } from './helpers';

export const MenuDetailView = ({ detailData, bahanPokokMap }) => {
    return (
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
    );
};
