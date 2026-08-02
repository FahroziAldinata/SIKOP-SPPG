import React from 'react';

export const PrintPoGabunganDocument = ({
    isPrinting,
    printGabunganData,
    nomorDokumenGabungan,
    namaLembaga,
    idLembaga,
    activePeriod,
    setIsPrinting,
    setPrintGabunganData,
}) => {
    if (!isPrinting || !printGabunganData) return null;

    const sortedTanggalList = [...printGabunganData.tanggalList].sort();
    const totalHargaGabungan = printGabunganData.ingredients.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const formatTanggalIndo = (tglStr) => {
        if (!tglStr) return '';
        const [y, m, d] = tglStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div style={{ padding: '25px', backgroundColor: '#fff', minHeight: '100vh', color: '#000', fontFamily: 'Courier New, monospace' }}>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background-color: #fff; color: #000; }
                }
            `}</style>
            <div className="no-print" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#eaeaea', display: 'flex', gap: '10px' }}>
                <button onClick={() => window.print()} style={{ padding: '8px 16px', fontWeight: 'bold', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Cetak Sekarang (Print)
                </button>
                <button onClick={() => { setIsPrinting(false); setPrintGabunganData(null); }} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Kembali
                </button>
            </div>

            {/* PO Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '10px', marginBottom: '20px' }}>
                <img src="/kop-po.png" alt="Logo" style={{ height: '117px', objectFit: 'contain' }} />
                <div style={{ marginLeft: '30px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '20px' }}>
                        BADAN GIZI NASIONAL <span style={{ color: 'var(--color-primary-light)' }}>(NATIONAL NUTRITION AGENCY)</span>
                    </div>
                    <div style={{ fontSize: '13px' }}>Gedung E Kompleks Kementrian Pertanian</div>
                    <div style={{ fontSize: '13px', textDecoration: 'underline' }}>Jalan Harsono RM Nomor 3 Ragunan, Pasar Minggu Jakarta 12550</div>
                </div>
            </div>

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline', marginBottom: '5px' }}>
                NOTA PESANAN BAHAN MAKANAN
            </div>
            <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', marginBottom: '15px' }}>
                NO {nomorDokumenGabungan || '-'}
            </div>

            <div style={{ fontSize: '13px', marginBottom: '20px' }}>
                <table style={{ width: '100%' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '120px', verticalAlign: 'top' }}>SPPG</td>
                            <td style={{ verticalAlign: 'top' }}>: {namaLembaga}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top' }}>ID SPPG</td>
                            <td style={{ verticalAlign: 'top' }}>: {idLembaga}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top' }}>Kepada</td>
                            <td style={{ verticalAlign: 'top' }}>: ALL CV</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top' }}>Alamat</td>
                            <td style={{ verticalAlign: 'top' }}>: Ditempat</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top' }}>Waktu</td>
                            <td style={{ verticalAlign: 'top' }}>: {sortedTanggalList.map(formatTanggalIndo).join(', ')}</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top' }}>PM</td>
                            <td style={{ verticalAlign: 'top' }}>: SISWA &amp; B3</td>
                        </tr>
                        <tr>
                            <td style={{ verticalAlign: 'top' }}>Menu</td>
                            <td style={{ verticalAlign: 'top' }}>: {
                                sortedTanggalList.map(tgl => {
                                    const cleanTgl = tgl.split('T')[0];
                                    return (printGabunganData.menuByTanggal && printGabunganData.menuByTanggal[cleanTgl]) || (printGabunganData.menuByTanggal && printGabunganData.menuByTanggal[tgl]);
                                })
                                .filter(Boolean)
                                .join(', ') || '—'
                            }</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '25px' }}>
                <thead>
                    <tr style={{ backgroundColor: 'var(--color-primary-light)' }}>
                        <th style={{ width: '30px' }}>No</th>
                        <th>Uraian Jenis Bahan Makanan</th>
                        {sortedTanggalList.flatMap(tgl => [
                            <th key={`h-siswa-${tgl}`} style={{ textAlign: 'center', fontSize: '10px' }}>
                                SISWA {tgl.split('-')[2]}
                            </th>,
                            <th key={`h-b3-${tgl}`} style={{ textAlign: 'center', fontSize: '10px' }}>
                                B3 {tgl.split('-')[2]}
                            </th>
                        ])}
                        <th style={{ width: '70px', textAlign: 'right' }}>QTY</th>
                        <th style={{ width: '50px', textAlign: 'center' }}>Satuan</th>
                        <th style={{ width: '90px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Jumlah</th>
                    </tr>
                </thead>
                <tbody>
                    {printGabunganData.ingredients.map((item, idx) => (
                        <tr key={item.bahanPokokId}>
                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                            <td>{item.nama}</td>
                            {sortedTanggalList.flatMap(tgl => [
                                <td key={`siswa-${item.bahanPokokId}-${tgl}`} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                    {Number(item.perTanggal[tgl]?.siswa || 0).toLocaleString('id-ID')}
                                </td>,
                                <td key={`b3-${item.bahanPokokId}-${tgl}`} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                    {Number(item.perTanggal[tgl]?.b3 || 0).toLocaleString('id-ID')}
                                </td>
                            ])}
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{Number(item.qtyTotal).toLocaleString('id-ID')}</td>
                            <td style={{ textAlign: 'center' }}>{item.satuan}</td>
                            <td style={{ textAlign: 'right' }}>Rp{Number(item.hargaSatuan).toLocaleString('id-ID')}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rp{Number(item.subtotal).toLocaleString('id-ID')}</td>
                        </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: 'var(--color-primary-light)' }}>
                        <td></td>
                        <td></td>
                        <td colSpan={sortedTanggalList.length * 2}>Total:</td>
                        <td style={{ textAlign: 'right' }}>
                            {printGabunganData.ingredients.reduce((sum, item) => sum + Number(item.qtyTotal), 0).toLocaleString('id-ID')}
                        </td>
                        <td></td>
                        <td></td>
                        <td style={{ textAlign: 'right' }}>Rp{totalHargaGabungan.toLocaleString('id-ID')}</td>
                    </tr>
                </tbody>
            </table>

            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end', fontSize: '13px' }}>
                <div style={{ textAlign: 'center', width: '300px' }}>
                    <div>{activePeriod?.setupLembaga?.tempatPelaporan || namaLembaga}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div style={{ fontWeight: 'bold', marginTop: '5px' }}>Mitra SPPG {namaLembaga}</div>
                    <div style={{ height: '70px' }}></div>
                    <div style={{ fontWeight: 'bold' }}>
                        ( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )
                    </div>
                </div>
            </div>
        </div>
    );
};
