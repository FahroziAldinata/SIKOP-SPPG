import React from 'react';
import { DatePicker } from '../../DatePicker';

export const ReportFilterBar = ({
    periods, periodeId, setPeriodeId, selectedPeriodeIds, setSelectedPeriodeIds,
    jenisLaporan, handleReportChange, isKepala, stockTanggal, setStockTanggal,
    setIsStockTanggalManual, belanjaTanggalMulai, setBelanjaTanggalMulai,
    belanjaTanggalSelesai, setBelanjaTanggalSelesai, handlePeriodChangeForBelanja,
    harianTanggal, setHarianTanggal, bapsdNomorDokumen, setBapsdNomorDokumen
}) => {
    return (
        <>
                {/* Pilihan Jenis Laporan */}
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
                        Jenis Laporan
                    </label>
                    <select
                        value={jenisLaporan}
                        onChange={handleReportChange}
                        className="form-field"
                    >
                        {isKepala ? (
                            <>
                                <option value="LPD2M">LPD2M (Laporan Perkembangan Dana 2 Mingguan)</option>
                                <option value="BKU">Buku Kas Umum (BKU)</option>
                                <option value="LRA">LRA (Laporan Realisasi Anggaran)</option>
                                <option value="BAPSD">BAPSD (Berita Acara Pengalihan Sisa Dana)</option>
                                <option value="STOCK_BARANG">Stock Barang (Persediaan)</option>
                                <option value="LBBP">LBBP (Buku Belanja Bahan Pokok)</option>
                                <option value="BKK">BKK (Buku Kas Kecil)</option>
                            </>
                        ) : (
                            <>
                                <option value="BKU">Buku Kas Umum (BKU)</option>
                                <option value="BP_KAS">BP - Kas</option>
                                <option value="BP_BAHAN_BAKU">BP - Bahan Baku</option>
                                <option value="BP_OPERASIONAL">BP - Operasional</option>
                                <option value="BP_FASILITAS">BP - Insentif Fasilitas</option>
                                <option value="NERACA_SALDO">Neraca Saldo</option>
                                <option value="STOCK_BARANG">Stock Barang (Persediaan)</option>
                                <option value="BELANJA_BAHAN">Kebutuhan Belanja Bahan</option>
                                <option value="PER_PERIODE">Laporan Per Periode (Pagu vs Realisasi)</option>
                                <option value="PER_BULAN">Laporan Kas Bulanan</option>
                                <option value="LR">LR (Laporan Resume Penerimaan-Pengeluaran)</option>
                                <option value="HARIAN">Laporan Harian</option>
                                <option value="LRA">LRA (Laporan Realisasi Anggaran)</option>
                                <option value="LPD2M">LPD2M (Laporan Perkembangan Dana 2 Mingguan)</option>
                                <option value="BTT_OPERASIONAL">BTT - Operasional</option>
                                <option value="BTT_SEWA">BTT - Sewa</option>
                                <option value="SPTJ">SPTJ (Surat Pernyataan Tanggung Jawab)</option>
                                <option value="BAPSD">BAPSD (Berita Acara Pengalihan Sisa Dana)</option>
                                <option value="LBBP">LBBP (Buku Belanja Bahan Pokok)</option>
                                <option value="BKK">BKK (Buku Kas Kecil)</option>
                            </>
                        )}
                    </select>
                </div>

                {/* Pilihan Periode */}
                {jenisLaporan === 'LRA' || jenisLaporan === 'LPD2M' ? (
                    <div style={{ flex: '1 1 300px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Pilih Periode (Multi-Select)
                        </label>
                        <div style={{
                            maxHeight: '120px',
                            overflowY: 'auto',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg)'
                        }}>
                            {periods.map(p => {
                                const isChecked = selectedPeriodeIds.includes(p.id);
                                return (
                                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setSelectedPeriodeIds([...selectedPeriodeIds, p.id]);
                                                } else {
                                                    setSelectedPeriodeIds(selectedPeriodeIds.filter(id => id !== p.id));
                                                }
                                            }}
                                        />
                                        {p.tanggalMulai} - {p.tanggalSelesai} ({p.status})
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                ) : (
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
                            Periode
                        </label>
                        <select
                            value={periodeId}
                            onChange={e => {
                                const selectedId = e.target.value;
                                setIsStockTanggalManual(false);
                                if (jenisLaporan === 'BELANJA_BAHAN') {
                                    handlePeriodChangeForBelanja(selectedId);
                                } else {
                                    setPeriodeId(selectedId);
                                }
                            }}
                            className="form-field"
                        >
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.tanggalMulai} - {p.tanggalSelesai}
                                </option>
                            ))}
                        </select>
                    </div>
                )}


                {jenisLaporan === 'STOCK_BARANG' && (
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
                            Tanggal Cutoff Stock (Default: Tanggal Akhir Periode)
                        </label>
                        <DatePicker
                            value={stockTanggal}
                            onChange={(val) => {
                                setStockTanggal(val);
                                setIsStockTanggalManual(true);
                            }}
                            required
                        />
                    </div>
                )}

                {/* Belanja Bahan-specific Date Pickers */}
                {jenisLaporan === 'BELANJA_BAHAN' && (
                    <>
                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Tanggal Mulai
                            </label>
                            <DatePicker
                                value={belanjaTanggalMulai}
                                onChange={setBelanjaTanggalMulai}
                                defaultFocusMonth={belanjaTanggalMulai}
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Tanggal Selesai
                            </label>
                            <DatePicker
                                value={belanjaTanggalSelesai}
                                onChange={setBelanjaTanggalSelesai}
                                defaultFocusMonth={belanjaTanggalSelesai}
                                required
                            />
                        </div>
                    </>
                )}

                {/* Laporan Harian-specific Date Picker */}
                {jenisLaporan === 'HARIAN' && (
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
                            Tanggal
                        </label>
                        <DatePicker
                            value={harianTanggal}
                            onChange={setHarianTanggal}
                            required
                        />
                    </div>
                )}
        </>
    );
};
