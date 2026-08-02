import React from 'react';

export const PrintPoDocument = ({
    isPrinting,
    printPoData,
    activePeriod,
    namaLembaga,
    idLembaga,
    setIsPrinting,
    setPrintPoData,
}) => {
    if (!isPrinting || !printPoData) return null;

    const totalHargaDiminta = printPoData.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const totalHargaRealisasi = printPoData.items.reduce((sum, item) => sum + Number(item.subtotalRealisasi || 0), 0);
    const isRealized = printPoData.status !== 'DIAJUKAN';
    const tempatPelaporan = printPoData?.tempatPelaporan || activePeriod?.setupLembaga?.tempatPelaporan || namaLembaga;
    const tanggalHariIni = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

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
                <button onClick={() => { setIsPrinting(false); setPrintPoData(null); }} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer' }}>
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

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline', marginBottom: '15px' }}>
                NOTA PESANAN &amp; REALISASI BELANJA BAHAN MAKANAN
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', fontSize: '13px', marginBottom: '20px' }}>
                <div>
                    <table style={{ width: '100%' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '100px' }}>SPPG</td>
                                <td>: {namaLembaga}</td>
                            </tr>
                            <tr>
                                <td>ID SPPG</td>
                                <td>: {idLembaga}</td>
                            </tr>
                            <tr>
                                <td>Kepada</td>
                                <td>: {printPoData.supplier?.nama}</td>
                            </tr>
                            <tr>
                                <td>Status PO</td>
                                <td>: {printPoData.status}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <table style={{ width: '100%' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '100px' }}>Waktu</td>
                                <td>: {printPoData.tanggal.split('T')[0]}</td>
                            </tr>
                            <tr>
                                <td>Catatan</td>
                                <td>: {printPoData.catatan || '—'}</td>
                            </tr>
                            {printPoData.diterimaAt && (
                                <tr>
                                    <td>Diterima</td>
                                    <td>: {printPoData.diterimaAt.split('T')[0]} oleh Aslap</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '25px' }}>
                <thead>
                    <tr style={{ backgroundColor: 'var(--color-primary-light)' }}>
                        <th style={{ width: '30px' }} rowSpan="2">No</th>
                        <th rowSpan="2">Uraian Jenis Bahan Makanan</th>
                        <th rowSpan="2" style={{ width: '50px' }}>Satuan</th>
                        <th colSpan="3" style={{ textAlign: 'center' }}>Rencana (PO Diminta)</th>
                        {isRealized && <th colSpan="3" style={{ textAlign: 'center' }}>Realisasi (Belanja Aktual)</th>}
                    </tr>
                    <tr style={{ backgroundColor: 'var(--color-primary-light)' }}>
                        <th style={{ width: '70px', textAlign: 'right' }}>Qty</th>
                        <th style={{ width: '90px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Subtotal</th>
                        {isRealized && (
                            <>
                                <th style={{ width: '70px', textAlign: 'right' }}>Qty</th>
                                <th style={{ width: '90px', textAlign: 'right' }}>Harga Satuan</th>
                                <th style={{ width: '100px', textAlign: 'right' }}>Subtotal</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {printPoData.items.map((item, idx) => (
                        <tr key={item.id}>
                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                            <td>{item.bahanPokok?.nama}</td>
                            <td style={{ textAlign: 'center' }}>{item.bahanPokok?.satuan}</td>
                            <td style={{ textAlign: 'right' }}>{Number(item.qty).toLocaleString('id-ID')}</td>
                            <td style={{ textAlign: 'right' }}>Rp{Number(item.hargaSatuan).toLocaleString('id-ID')}</td>
                            <td style={{ textAlign: 'right' }}>Rp{Number(item.subtotal).toLocaleString('id-ID')}</td>
                            {isRealized && (
                                <>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {item.qtyRealisasi !== null ? Number(item.qtyRealisasi).toLocaleString('id-ID') : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {item.hargaSatuanRealisasi !== null ? `Rp${Number(item.hargaSatuanRealisasi).toLocaleString('id-ID')}` : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        {item.subtotalRealisasi !== null ? `Rp${Number(item.subtotalRealisasi).toLocaleString('id-ID')}` : '—'}
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: 'var(--color-primary-light)' }}>
                        <td colSpan="3" style={{ textAlign: 'right' }}>Total:</td>
                        <td colSpan="3" style={{ textAlign: 'right' }}>Rp{totalHargaDiminta.toLocaleString('id-ID')}</td>
                        {isRealized && <td colSpan="3" style={{ textAlign: 'right' }}>Rp{totalHargaRealisasi.toLocaleString('id-ID')}</td>}
                    </tr>
                </tbody>
            </table>

            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end', fontSize: '13px' }}>
                <div style={{ textAlign: 'center', width: '300px' }}>
                    <div>{tempatPelaporan}, {tanggalHariIni}</div>
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
