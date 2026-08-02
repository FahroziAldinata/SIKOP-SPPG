import React from 'react';

export const AddSupplierModal = ({
    isAddSupplierOpen,
    newSupplier,
    setNewSupplier,
    handleAddSupplier,
    supplierSubmitting,
    setIsAddSupplierOpen,
}) => {
    if (!isAddSupplierOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <form onSubmit={handleAddSupplier} style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                width: '100%',
                maxWidth: '450px',
                padding: '24px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-hover)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Tambah Supplier / CV Baru</h3>
                
                <div>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Nama Supplier / CV *
                    </label>
                    <input
                        type="text"
                        className="form-field"
                        placeholder="Contoh: CV Sembako Makmur"
                        value={newSupplier.nama}
                        onChange={e => setNewSupplier(prev => ({ ...prev, nama: e.target.value }))}
                        required
                    />
                </div>

                <div>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Kontak / Telepon (opsional)
                    </label>
                    <input
                        type="text"
                        className="form-field"
                        placeholder="Contoh: 0812345678"
                        value={newSupplier.kontak}
                        onChange={e => setNewSupplier(prev => ({ ...prev, kontak: e.target.value }))}
                    />
                </div>

                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={() => {
                            setNewSupplier({ nama: '', kontak: '' });
                            setIsAddSupplierOpen(false);
                        }}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--border)',
                            color: 'var(--text)',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600
                        }}
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={supplierSubmitting}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--btn-primary-bg)',
                            color: 'var(--btn-primary-text)',
                            border: 'none',
                            cursor: supplierSubmitting ? 'not-allowed' : 'pointer',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                            opacity: supplierSubmitting ? 0.6 : 1
                        }}
                    >
                        {supplierSubmitting ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </form>
        </div>
    );
};
