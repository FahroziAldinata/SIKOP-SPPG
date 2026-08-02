import React from 'react';

export const ReportActionButtons = ({
    handleReportChange, jenisLaporan, loadLra, lraLoading, previewLraPdf, lraPdfLoading,
    exportLraExcel, lraExcelLoading, loadLpd2m, lpd2mLoading, previewLpd2mPdf, lpd2mPdfLoading,
    previewBkuPdf, previewCatatanPdf, pdfLoading, exportBkuExcel, bkuExcelLoading, previewBpPdf,
    bpData, loadStockBarang, stockTanggal, previewStockBarangPdf, exportStockExcel, stockExcelLoading,
    loadKebutuhanBelanja, previewBelanjaPdf, loadLaporanPerPeriode, perPeriodeData,
    previewPerPeriodePdf, loadLaporanPerBulan, perBulanData, previewPerBulanPdf, loadBttData,
    bttLoading, previewBttPdf, bttPdfLoading, bttData, previewLrPdf, lrLoading, loadLaporanHarian,
    harianLoading, previewHarianPdf, harianPdfLoading, harianData, loadBapsd, bapsdLoading,
    previewBapsdPdf, bapsdPdfLoading, bapsdNomorDokumen, setBapsdNomorDokumen, loadSptj,
    sptjLoading, previewSptjPdf, sptjPdfLoading, loadLbbp, lbbpLoading, previewLbbpPdf,
    lbbpPdfLoading, loadBkk, bkkLoading, previewBkkPdf, bkkPdfLoading, selectedPeriodeIds, periodeId
}) => {
    return (
                <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px' }}>
                    {jenisLaporan === 'LRA' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLra}
                                disabled={lraLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: lraLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: lraLoading ? 0.65 : 1
                                }}
                            >
                                {lraLoading ? 'Memuat…' : 'Tampilkan LRA'}
                            </button>
                            <button
                                type="button"
                                onClick={previewLraPdf}
                                disabled={lraPdfLoading || selectedPeriodeIds.length < 2}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (lraPdfLoading || selectedPeriodeIds.length < 2) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (lraPdfLoading || selectedPeriodeIds.length < 2) ? 0.65 : 1
                                }}
                            >
                                {lraPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF LRA'}
                            </button>
                            <button
                                type="button"
                                onClick={exportLraExcel}
                                disabled={lraExcelLoading || selectedPeriodeIds.length < 2}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#217346',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (lraExcelLoading || selectedPeriodeIds.length < 2) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (lraExcelLoading || selectedPeriodeIds.length < 2) ? 0.65 : 1
                                }}
                            >
                                {lraExcelLoading ? 'Mengekspor…' : '📊 Export Excel LRA'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'LPD2M' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLpd2m}
                                disabled={lpd2mLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: lpd2mLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: lpd2mLoading ? 0.65 : 1
                                }}
                            >
                                {lpd2mLoading ? 'Memuat…' : 'Tampilkan LPD2M'}
                            </button>
                            <button
                                type="button"
                                onClick={previewLpd2mPdf}
                                disabled={lpd2mPdfLoading || !selectedPeriodeIds.length}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (lpd2mPdfLoading || !selectedPeriodeIds.length) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (lpd2mPdfLoading || !selectedPeriodeIds.length) ? 0.65 : 1
                                }}
                            >
                                {lpd2mPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF LPD2M'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'BKU' && (
                        <>
                            <button
                                type="button"
                                onClick={previewBkuPdf}
                                disabled={pdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: pdfLoading ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF…' : '📄 Preview PDF'}
                            </button>
                            <button
                                type="button"
                                onClick={previewCatatanPdf}
                                disabled={pdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: pdfLoading ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF…' : '📄 Preview Catatan Pengeluaran'}
                            </button>
                            <button
                                type="button"
                                onClick={exportBkuExcel}
                                disabled={bkuExcelLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#217346',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bkuExcelLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bkuExcelLoading ? 0.65 : 1
                                }}
                            >
                                {bkuExcelLoading ? 'Mengekspor…' : '📊 Export Excel BKU'}
                            </button>
                        </>
                    )}
                    {(jenisLaporan === 'BP_KAS' || jenisLaporan === 'BP_BAHAN_BAKU' || jenisLaporan === 'BP_OPERASIONAL' || jenisLaporan === 'BP_FASILITAS') && (
                        <button
                            type="button"
                            onClick={previewBpPdf}
                            disabled={pdfLoading || !bpData}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: (pdfLoading || !bpData) ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                opacity: (pdfLoading || !bpData) ? 0.65 : 1
                            }}
                        >
                            {pdfLoading ? 'Membuat PDF…' : '📄 Preview PDF BP'}
                        </button>
                    )}
                    {jenisLaporan === 'STOCK_BARANG' && (
                        <>
                            <button
                                type="button"
                                onClick={() => loadStockBarang(periodeId, stockTanggal)}
                                className="btn-secondary"
                                style={{
                                    padding: '10px 20px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Refresh
                            </button>
                            <button
                                type="button"
                                onClick={previewStockBarangPdf}
                                disabled={pdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: pdfLoading ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF...' : '\uD83D\uDCC4 Preview PDF Stock Barang'}
                            </button>
                            <button
                                type="button"
                                onClick={exportStockExcel}
                                disabled={stockExcelLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#217346',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: stockExcelLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: stockExcelLoading ? 0.65 : 1
                                }}
                            >
                                {stockExcelLoading ? 'Mengekspor…' : '📊 Export Excel Stock'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'BELANJA_BAHAN' && (
                        <>
                            <button
                                type="button"
                                onClick={loadKebutuhanBelanja}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Tampilkan Laporan
                            </button>
                            <button
                                type="button"
                                onClick={previewBelanjaPdf}
                                disabled={pdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: pdfLoading ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF...' : '\uD83D\uDCC4 Preview PDF'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'PER_PERIODE' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLaporanPerPeriode}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Tampilkan Laporan
                            </button>
                            <button
                                type="button"
                                onClick={previewPerPeriodePdf}
                                disabled={pdfLoading || !perPeriodeData}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (pdfLoading || !perPeriodeData) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (pdfLoading || !perPeriodeData) ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF...' : '\uD83D\uDCC4 Preview PDF'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'PER_BULAN' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLaporanPerBulan}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Tampilkan Laporan
                            </button>
                            <button
                                type="button"
                                onClick={previewPerBulanPdf}
                                disabled={pdfLoading || !perBulanData}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (pdfLoading || !perBulanData) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (pdfLoading || !perBulanData) ? 0.65 : 1
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF...' : '\uD83D\uDCC4 Preview PDF'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'BTT_OPERASIONAL' || jenisLaporan === 'BTT_SEWA' ? (
                        <>
                            <button
                                type="button"
                                onClick={loadBttData}
                                disabled={bttLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bttLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bttLoading ? 0.65 : 1
                                }}
                            >
                                {bttLoading ? 'Memuat...' : 'Tampilkan Data BTT'}
                            </button>
                            {bttData && (
                                <button
                                    type="button"
                                    onClick={previewBttPdf}
                                    disabled={bttPdfLoading}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: bttPdfLoading ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        opacity: bttPdfLoading ? 0.65 : 1
                                    }}
                                >
                                    {bttPdfLoading ? 'Membuat PDF...' : '\uD83D\uDCC4 Preview PDF BTT'}
                                </button>
                            )}
                        </>
                    ) : null}
                    {jenisLaporan === 'LR' && (
                        <button
                            type="button"
                            onClick={previewLrPdf}
                            disabled={lrLoading}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: lrLoading ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                opacity: lrLoading ? 0.65 : 1
                            }}
                        >
                            {lrLoading ? 'Membuat PDF…' : '\uD83D\uDCC4 Preview PDF LR'}
                        </button>
                    )}
                    {jenisLaporan === 'HARIAN' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLaporanHarian}
                                disabled={harianLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: harianLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: harianLoading ? 0.65 : 1
                                }}
                            >
                                {harianLoading ? 'Memuat…' : 'Tampilkan Laporan'}
                            </button>
                            <button
                                type="button"
                                onClick={previewHarianPdf}
                                disabled={harianPdfLoading || !harianData}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: (harianPdfLoading || !harianData) ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: (harianPdfLoading || !harianData) ? 0.65 : 1
                                }}
                            >
                                {harianPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'BAPSD' && (
                        <>
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
                                    Nomor Dokumen
                                </label>
                                <input
                                    type="text"
                                    className="form-field"
                                    placeholder="Contoh: 001/BAPSD/2026"
                                    value={bapsdNomorDokumen}
                                    onChange={e => setBapsdNomorDokumen(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={loadBapsd}
                                disabled={bapsdLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bapsdLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bapsdLoading ? 0.65 : 1
                                }}
                            >
                                {bapsdLoading ? 'Memuat…' : 'Tampilkan BAPSD'}
                            </button>
                            <button
                                type="button"
                                onClick={previewBapsdPdf}
                                disabled={bapsdPdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bapsdPdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bapsdPdfLoading ? 0.65 : 1
                                }}
                            >
                                {bapsdPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF BAPSD'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'SPTJ' && (
                        <>
                            <button
                                type="button"
                                onClick={loadSptj}
                                disabled={sptjLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: sptjLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: sptjLoading ? 0.65 : 1
                                }}
                            >
                                {sptjLoading ? 'Memuat…' : 'Tampilkan SPTJ'}
                            </button>
                            <button
                                type="button"
                                onClick={previewSptjPdf}
                                disabled={sptjPdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: sptjPdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: sptjPdfLoading ? 0.65 : 1
                                }}
                            >
                                {sptjPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF SPTJ'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'LBBP' && (
                        <>
                            <button
                                type="button"
                                onClick={loadLbbp}
                                disabled={lbbpLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: lbbpLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: lbbpLoading ? 0.65 : 1
                                }}
                            >
                                {lbbpLoading ? 'Memuat…' : 'Tampilkan LBBP'}
                            </button>
                            <button
                                type="button"
                                onClick={previewLbbpPdf}
                                disabled={lbbpPdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: lbbpPdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: lbbpPdfLoading ? 0.65 : 1
                                }}
                            >
                                {lbbpPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF LBBP'}
                            </button>
                        </>
                    )}
                    {jenisLaporan === 'BKK' && (
                        <>
                            <button
                                type="button"
                                onClick={loadBkk}
                                disabled={bkkLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bkkLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bkkLoading ? 0.65 : 1
                                }}
                            >
                                {bkkLoading ? 'Memuat…' : 'Tampilkan BKK'}
                            </button>
                            <button
                                type="button"
                                onClick={previewBkkPdf}
                                disabled={bkkPdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: bkkPdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: bkkPdfLoading ? 0.65 : 1
                                }}
                            >
                                {bkkPdfLoading ? 'Membuat PDF…' : '📄 Preview PDF BKK'}
                            </button>
                        </>
                    )}
                </div>
    );
};
