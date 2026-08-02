import React from 'react';
import { Table } from '../../Table';

export const LaporanHarianSection = ({ harianData }) => {
    return (
        <>
            {harianData && (
                <div>
                    <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ margin: '4px 0' }}><strong>Menu:</strong> {harianData.menuDescription || '\u2014'}</p>
                        <p style={{ margin: '4px 0' }}><strong>Total Penerima:</strong> {harianData.totalPenerima} orang</p>
                    </div>

                    <h4 style={{ marginBottom: '8px' }}>Penerima Manfaat</h4>
                    <Table
                        columns={[
                            { key: 'kategori', header: 'Kategori' },
                            { key: 'lakiLaki', header: 'Laki-laki', align: 'center' },
                            { key: 'perempuan', header: 'Perempuan', align: 'center' },
                            { key: 'total', header: 'Total', align: 'center' }
                        ]}
                        data={harianData.penerimaManfaat}
                        emptyText="Tidak ada data penerima manfaat untuk hari ini."
                    />

                    <h4 style={{ marginTop: '24px', marginBottom: '8px' }}>Belanja</h4>
                    {harianData.belanja.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Tidak ada belanja untuk tanggal ini.</p>
                    ) : (
                        harianData.belanja.map(po => (
                            <div key={po.poId} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                <p style={{ margin: '4px 0', fontWeight: 600 }}>
                                    Supplier: {po.supplier} | Status: {po.status} | Total: Rp{po.totalBelanja.toLocaleString('id-ID')}
                                </p>
                                <Table
                                    columns={[
                                        { key: 'bahan', header: 'Bahan' },
                                        { key: 'qty', header: 'Qty', align: 'center', render: (v) => Number(v).toLocaleString('id-ID', { minimumFractionDigits: 2 }) },
                                        { key: 'satuan', header: 'Satuan' },
                                        { key: 'hargaSatuan', header: 'Harga', align: 'center', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` },
                                        { key: 'subtotal', header: 'Subtotal', align: 'center', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` }
                                    ]}
                                    data={po.items}
                                />
                            </div>
                        ))
                    )}

                    <h4 style={{ marginTop: '24px', marginBottom: '8px' }}>Biaya</h4>
                    <Table
                        columns={[
                            { key: 'nomorBukti', header: 'No Bukti' },
                            { key: 'uraian', header: 'Uraian' },
                            { key: 'akunDanaBiaya', header: 'Akun Biaya' },
                            { key: 'nominal', header: 'Nominal', align: 'center', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` }
                        ]}
                        data={harianData.biaya}
                        emptyText="Tidak ada biaya untuk tanggal ini."
                    />

                    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <p style={{ margin: '4px 0' }}><strong>Total Belanja:</strong> Rp{harianData.totalBelanja.toLocaleString('id-ID')}</p>
                        <p style={{ margin: '4px 0' }}><strong>Total Biaya Keluar:</strong> Rp{harianData.totalBiayaKeluar.toLocaleString('id-ID')}</p>
                        <p style={{ margin: '4px 0', fontWeight: 700 }}>
                            <strong>Grand Total:</strong> Rp{(harianData.totalBelanja + harianData.totalBiayaKeluar).toLocaleString('id-ID')}
                        </p>
                    </div>
                </div>
            )}
            {!harianData && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Pilih tanggal dan klik &quot;Tampilkan Laporan&quot; untuk memuat data.
                </p>
            )}
        </>
    );
};
