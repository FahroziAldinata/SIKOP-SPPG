import React from 'react';
import { Table } from '../../Table';

export const PerPeriodeTable = ({ perPeriodeData }) => {
    return (
        <>
            {perPeriodeData !== null && (
                <div>
                    <Table
                        columns={[
                            { key: 'kategori', header: 'Kategori Pos Anggaran' },
                            {
                                key: 'rab',
                                header: 'Anggaran (RAB)',
                                align: 'center',
                                render: (v) => (
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </span>
                                )
                            },
                            {
                                key: 'aktual',
                                header: 'Realisasi (Aktual)',
                                align: 'center',
                                render: (v, row) => (
                                    <span style={{ color: row.isEstimasi ? 'var(--color-primary)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                                        Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}{row.isEstimasi ? ' (estimasi)' : ''}
                                    </span>
                                )
                            },
                            {
                                key: 'selisih',
                                header: 'Selisih (Sisa)',
                                align: 'center',
                                render: (v) => (
                                    <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                        Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </strong>
                                )
                            }
                        ]}
                        data={[
                            {
                                kategori: 'Bahan Makanan (Pendidikan)',
                                rab: perPeriodeData.bahanMakanan.pendidikan.rab,
                                aktual: perPeriodeData.bahanMakanan.pendidikan.aktual,
                                selisih: perPeriodeData.bahanMakanan.pendidikan.selisih,
                                isEstimasi: true
                            },
                            {
                                kategori: 'Bahan Makanan (Posyandu)',
                                rab: perPeriodeData.bahanMakanan.posyandu.rab,
                                aktual: perPeriodeData.bahanMakanan.posyandu.aktual,
                                selisih: perPeriodeData.bahanMakanan.posyandu.selisih,
                                isEstimasi: true
                            },
                            {
                                kategori: 'Biaya Operasional',
                                rab: perPeriodeData.operasional.rab,
                                aktual: perPeriodeData.operasional.aktual,
                                selisih: perPeriodeData.operasional.selisih,
                                isEstimasi: false
                            },
                            {
                                kategori: 'Biaya Insentif Fasilitas',
                                rab: perPeriodeData.insentifFasilitas.rab,
                                aktual: perPeriodeData.insentifFasilitas.aktual,
                                selisih: perPeriodeData.insentifFasilitas.selisih,
                                isEstimasi: false
                            }
                        ]}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '12px' }}>
                        * Catatan: Realisasi Bahan Makanan untuk Pendidikan &amp; Posyandu dihitung menggunakan metode alokasi proporsional berdasarkan rasio RAB (PROPORSIONAL_RAB).
                    </p>
                </div>
            )}
            {perPeriodeData === null && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Silakan klik tombol "Tampilkan Laporan" untuk memuat data.
                </p>
            )}
        </>
    );
};
