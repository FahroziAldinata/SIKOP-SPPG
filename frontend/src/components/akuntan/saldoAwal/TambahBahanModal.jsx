import React from 'react';
import Dropdown from '../../Dropdown';

export const TambahBahanModal = ({
    isOpen = false,
    newNama = '',
    onNewNamaChange,
    newSatuan = '',
    onNewSatuanChange,
    newTipePenyimpanan = 'HABIS_HARI_ITU',
    onNewTipePenyimpananChange,
    newSatuanHitungan = '',
    onNewSatuanHitunganChange,
    newKonversiPerKg = '',
    onNewKonversiPerKgChange,
    onSubmit,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000,
        }}>
            <form onSubmit={onSubmit} style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px', width: '90%', maxWidth: '500px',
                boxShadow: 'var(--shadow-hover)',
                display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                    Tambah Bahan Pokok Baru
                </h3>

                <div>
                    <label style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nama Bahan *</label>
                    <input type="text" className="form-field" placeholder="Contoh: Beras Premium" value={newNama} onChange={(e) => onNewNamaChange(e.target.value)} required />
                </div>

                <div>
                    <label style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Satuan *</label>
                    <input type="text" className="form-field" placeholder="Contoh: kg, liter, butir" value={newSatuan} onChange={(e) => onNewSatuanChange(e.target.value)} required />
                </div>

                <div>
                    <label style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Tipe Penyimpanan</label>
                    <Dropdown
                        value={newTipePenyimpanan}
                        onChange={onNewTipePenyimpananChange}
                        options={[
                            { value: 'HABIS_HARI_ITU', label: 'Habis Hari Itu (JIT)' },
                            { value: 'STOK_GUDANG', label: 'Stok Gudang (Tahan Lama)' }
                        ]}
                    />
                </div>

                <div>
                    <label style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Satuan Hitungan (opsional, misal: BUTIR)</label>
                    <input type="text" className="form-field" placeholder="Contoh: BUTIR" value={newSatuanHitungan} onChange={(e) => onNewSatuanHitunganChange(e.target.value)} />
                </div>

                <div>
                    <label style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Konversi Per Kg (opsional, misal: 15)</label>
                    <input type="number" step="0.001" className="form-field" placeholder="Contoh: 15" value={newKonversiPerKg} onChange={(e) => onNewKonversiPerKgChange(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" onClick={onClose} style={{ padding: '9px 16px', backgroundColor: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)', color: 'var(--btn-cancel-text)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Batal</button>
                    <button type="submit" style={{ padding: '9px 16px', backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Simpan</button>
                </div>
            </form>
        </div>
    );
};
