import React from 'react';
import { DatePicker } from '../../DatePicker';

export const PelaporanFieldset = ({
    tahunAnggaran,
    setTahunAnggaran,
    tempatPelaporan,
    setTempatPelaporan,
    tanggalPelaporan,
    setTanggalPelaporan,
    awalPeriodeBerikutnya,
    setAwalPeriodeBerikutnya
}) => {
    return (
        <fieldset style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '20px',
            margin: 0,
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text)'
        }}>
            <legend style={{
                fontWeight: '700',
                padding: '0 8px',
                color: 'var(--text)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                3. Pelaporan &amp; Periode Berikutnya
            </legend>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
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
                        Tahun Anggaran *
                    </label>
                    <input
                        type="number"
                        value={tahunAnggaran}
                        onChange={e => setTahunAnggaran(e.target.value)}
                        className="form-field"
                        required
                    />
                </div>
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
                        Tempat Pelaporan (Kota) *
                    </label>
                    <input
                        type="text"
                        value={tempatPelaporan}
                        onChange={e => setTempatPelaporan(e.target.value)}
                        className="form-field"
                        required
                    />
                </div>
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
                        Tanggal Tanda Tangan Laporan *
                    </label>
                    <DatePicker
                        value={tanggalPelaporan}
                        onChange={setTanggalPelaporan}
                        required
                    />
                </div>
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
                        Awal Periode Berikutnya *
                    </label>
                    <DatePicker
                        value={awalPeriodeBerikutnya}
                        onChange={setAwalPeriodeBerikutnya}
                        required
                    />
                </div>
            </div>
        </fieldset>
    );
};
