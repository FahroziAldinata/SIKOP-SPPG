import React from 'react';

export const LraTable = ({ lraData }) => {
    return (
        <>
            {lraData && (() => {
                const katMap = {
                    BAHAN_MAKANAN: 'Bahan Makanan',
                    OPERASIONAL: 'Operasional',
                    INSENTIF_FASILITAS: 'Insentif / Fasilitas'
                };
                const categories = ['BAHAN_MAKANAN', 'OPERASIONAL', 'INSENTIF_FASILITAS'];
                const byKat = Object.fromEntries(lraData.kategoriSummary.map(r => [r.kategori, r]));
                const totalRow = byKat['TOTAL'] || lraData.kategoriSummary.find(r => r.isTotal) || {};

                return (
                    <>
                        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                        <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'left' }}></th>
                                        {categories.map(kat => (
                                            <th key={kat} colSpan={3} style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                                {katMap[kat]}
                                            </th>
                                        ))}
                                        <th colSpan={3} style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center', borderLeft: '2px solid var(--border)' }}>
                                            Total Keseluruhan
                                        </th>
                                    </tr>
                                    <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                        <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}></th>
                                        {categories.map(kat => (
                                            <React.Fragment key={kat}>
                                                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>RAB</th>
                                                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center' }}>Realisasi</th>
                                                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center' }}>%</th>
                                            </React.Fragment>
                                        ))}
                                        <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center', borderLeft: '2px solid var(--border)' }}>Total RAB</th>
                                        <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center' }}>Total Realisasi</th>
                                        <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--table-header-text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center' }}>% Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lraData.periodeList.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{p.label}</td>
                                            {categories.map(kat => {
                                                const row = byKat[kat] || {};
                                                const rab = row[`rab_${p.id}`] || 0;
                                                const aktual = row[`aktual_${p.id}`] || 0;
                                                const persen = row[`persen_${p.id}`] || 0;
                                                return (
                                                    <React.Fragment key={kat}>
                                                        <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: '1px solid var(--border)', textAlign: 'center', borderLeft: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>
                                                            Rp{rab.toLocaleString('id-ID')}
                                                        </td>
                                                        <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                                            Rp{aktual.toLocaleString('id-ID')}
                                                        </td>
                                                        <td style={{
                                                            padding: '16px 18px', fontSize: 14, borderBottom: '1px solid var(--border)', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                                                            color: persen >= 90 ? 'var(--color-success)' : persen >= 60 ? '#d97706' : 'var(--color-danger)'
                                                        }}>
                                                            {persen.toFixed(1)}%
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                            {(() => {
                                                const rab = totalRow[`rab_${p.id}`] || 0;
                                                const aktual = totalRow[`aktual_${p.id}`] || 0;
                                                const persen = totalRow[`persen_${p.id}`] || 0;
                                                return (
                                                    <React.Fragment>
                                                        <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: '1px solid var(--border)', textAlign: 'center', borderLeft: '2px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>
                                                            Rp{rab.toLocaleString('id-ID')}
                                                        </td>
                                                        <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                                            Rp{aktual.toLocaleString('id-ID')}
                                                        </td>
                                                        <td style={{
                                                            padding: '16px 18px', fontSize: 14, borderBottom: '1px solid var(--border)', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                                                            color: persen >= 90 ? 'var(--color-success)' : persen >= 60 ? '#d97706' : 'var(--color-danger)'
                                                        }}>
                                                            {persen.toFixed(1)}%
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })()}
                                        </tr>
                                    ))}
                                    <tr style={{ fontWeight: 700, backgroundColor: 'var(--bg-elevated)' }}>
                                        <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: 'none' }}>TOTAL</td>
                                        {categories.map(kat => {
                                            const row = byKat[kat] || {};
                                            const rab = row.totalRAB || 0;
                                            const aktual = row.totalAktual || 0;
                                            const persen = row.totalPersen || 0;
                                            return (
                                                <React.Fragment key={kat}>
                                                    <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: 'none', textAlign: 'center', borderLeft: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>
                                                        Rp{rab.toLocaleString('id-ID')}
                                                    </td>
                                                    <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: 'none', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                                        Rp{aktual.toLocaleString('id-ID')}
                                                    </td>
                                                    <td style={{
                                                        padding: '16px 18px', fontSize: 14, borderBottom: 'none', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                                                        color: persen >= 90 ? 'var(--color-success)' : persen >= 60 ? '#d97706' : 'var(--color-danger)'
                                                    }}>
                                                        {persen.toFixed(1)}%
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}
                                        {(() => {
                                            const rab = totalRow.totalRAB || 0;
                                            const aktual = totalRow.totalAktual || 0;
                                            const persen = totalRow.totalPersen || 0;
                                            return (
                                                <React.Fragment>
                                                    <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: 'none', textAlign: 'center', borderLeft: '2px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>
                                                        Rp{rab.toLocaleString('id-ID')}
                                                    </td>
                                                    <td style={{ padding: '16px 18px', fontSize: 14, color: 'var(--text)', borderBottom: 'none', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                                        Rp{aktual.toLocaleString('id-ID')}
                                                    </td>
                                                    <td style={{
                                                        padding: '16px 18px', fontSize: 14, borderBottom: 'none', textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                                                        color: persen >= 90 ? 'var(--color-success)' : persen >= 60 ? '#d97706' : 'var(--color-danger)'
                                                    }}>
                                                        {persen.toFixed(1)}%
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })()}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        {lraData?.pendingTransfer && (
                            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '6px', fontSize: '13px', color: '#8c6b00' }}>
                                ⚠️ <strong>Catatan:</strong> Realisasi pendapatan {lraData.ringkasan?.totalPendapatan?.realisasi === 0 ? 'Rp 0' : `Rp ${(lraData.ringkasan?.totalPendapatan?.realisasi || 0).toLocaleString('id-ID')}`} — dana BGN belum tercatat masuk (pending transfer).
                            </div>
                        )}
                    </>
                );
            })()}
            {!lraData && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Pilih minimal 2 periode di atas dan klik "Tampilkan LRA".
                </p>
            )}
        </>
    );
};
