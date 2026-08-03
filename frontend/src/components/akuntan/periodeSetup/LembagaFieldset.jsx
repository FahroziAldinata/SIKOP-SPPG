import React from 'react';

export const LembagaFieldset = ({
    namaLembaga,
    setNamaLembaga,
    nomorRekeningVA,
    setNomorRekeningVA,
    alamat,
    setAlamat,
    namaKepalaSPPG,
    setNamaKepalaSPPG,
    namaAkuntanSPPG,
    setNamaAkuntanSPPG,
    namaYayasan,
    setNamaYayasan,
    ketuaYayasan,
    setKetuaYayasan
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
                2. Pengaturan Lembaga &amp; Pejabat Penandatangan
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
                        Nama Satuan Pelayanan (SPPG) *
                    </label>
                    <input
                        type="text"
                        value={namaLembaga}
                        onChange={e => setNamaLembaga(e.target.value)}
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
                        Nomor Rekening Virtual Account (VA) *
                    </label>
                    <input
                        type="text"
                        value={nomorRekeningVA}
                        onChange={e => setNomorRekeningVA(e.target.value)}
                        className="form-field"
                        required
                    />
                </div>
                <div style={{ flex: '1 1 100%' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Alamat Lembaga *
                    </label>
                    <input
                        type="text"
                        value={alamat}
                        onChange={e => setAlamat(e.target.value)}
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
                        Nama Kepala SPPG *
                    </label>
                    <input
                        type="text"
                        value={namaKepalaSPPG}
                        onChange={e => setNamaKepalaSPPG(e.target.value)}
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
                        Nama Akuntan SPPG *
                    </label>
                    <input
                        type="text"
                        value={namaAkuntanSPPG}
                        onChange={e => setNamaAkuntanSPPG(e.target.value)}
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
                        Nama Yayasan Pembina *
                    </label>
                    <input
                        type="text"
                        value={namaYayasan}
                        onChange={e => setNamaYayasan(e.target.value)}
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
                        Nama Ketua Yayasan *
                    </label>
                    <input
                        type="text"
                        value={ketuaYayasan}
                        onChange={e => setKetuaYayasan(e.target.value)}
                        className="form-field"
                        required
                    />
                </div>
            </div>
        </fieldset>
    );
};
