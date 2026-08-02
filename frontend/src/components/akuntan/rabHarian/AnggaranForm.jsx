import React from 'react';
import { DatePicker } from '../../DatePicker';
import Dropdown from '../../Dropdown';
import { NumberInput } from '../../NumberInput';

export const AnggaranForm = ({
    anggaranEditTarget,
    setAnggaranEditTarget,
    anggaranForm,
    setAnggaranForm,
    activePeriod,
    createAnggaranHarian,
    saveEditAnggaran
}) => {
    return (
        <>
            {/* ─── Create Form / Edit Modal ─── */}
            {anggaranEditTarget ? (
                <form onSubmit={saveEditAnggaran} style={{
                    border: '1px solid var(--color-warning, #f59e0b)', borderRadius: 'var(--radius-md)',
                    padding: '24px', backgroundColor: 'var(--bg-elevated)',
                    boxShadow: 'var(--shadow)', marginBottom: '20px',
                    display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>
                        Edit Anggaran Harian
                    </h3>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{
                                textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                            }}>Tanggal</label>
                            <DatePicker
                                value={anggaranEditTarget.tanggal}
                                onChange={val => setAnggaranEditTarget(prev => ({ ...prev, tanggal: val }))}
                                defaultFocusMonth={activePeriod?.tanggalMulai}
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{
                                textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                            }}>Kategori Dana</label>
                            <Dropdown
                                style={{ width: '100%' }}
                                value={anggaranEditTarget.kategoriDana}
                                onChange={val => setAnggaranEditTarget(prev => ({ ...prev, kategoriDana: val }))}
                                options={[
                                    { value: '', label: '-- Pilih Kategori Dana --' },
                                    { value: 'OPERASIONAL', label: 'OPERASIONAL' },
                                    { value: 'INSENTIF_FASILITAS', label: 'INSENTIF_FASILITAS (SEWA)' }
                                ]}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{
                                textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                            }}>Total Anggaran (Rp)</label>
                            <NumberInput
                                placeholder="Total Anggaran"
                                value={anggaranEditTarget.totalAnggaran}
                                onChange={val => setAnggaranEditTarget(prev => ({ ...prev, totalAnggaran: val }))}
                                className="form-field"
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{
                                textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                            }}>Keterangan</label>
                            <input
                                type="text"
                                placeholder="Keterangan"
                                value={anggaranEditTarget.keterangan || ''}
                                onChange={e => setAnggaranEditTarget(prev => ({ ...prev, keterangan: e.target.value }))}
                                className="form-field"
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="submit" style={{
                            padding: '10px 20px', backgroundColor: 'var(--color-warning, #f59e0b)',
                            color: '#fff', border: 'none',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                        }}>
                            Simpan Perubahan
                        </button>
                        <button type="button" onClick={() => setAnggaranEditTarget(null)} style={{
                            padding: '10px 20px', backgroundColor: 'transparent',
                            color: 'var(--text-muted)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                        }}>
                            Batal
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={createAnggaranHarian} style={{
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                    padding: '24px', backgroundColor: 'var(--bg-elevated)',
                    boxShadow: 'var(--shadow)', marginBottom: '20px',
                    display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Buat Anggaran Harian</h3>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{
                                textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                            }}>Tanggal</label>
                            <DatePicker
                                value={anggaranForm.tanggal}
                                onChange={val => setAnggaranForm(prev => ({ ...prev, tanggal: val }))}
                                defaultFocusMonth={activePeriod?.tanggalMulai}
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{
                                textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                            }}>Kategori Dana</label>
                            <Dropdown
                                style={{ width: '100%' }}
                                value={anggaranForm.kategoriDana}
                                onChange={val => setAnggaranForm(prev => ({ ...prev, kategoriDana: val }))}
                                options={[
                                    { value: '', label: '-- Pilih Kategori Dana --' },
                                    { value: 'OPERASIONAL', label: 'OPERASIONAL' },
                                    { value: 'INSENTIF_FASILITAS', label: 'INSENTIF_FASILITAS (SEWA)' }
                                ]}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{
                                textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                            }}>Total Anggaran (Rp)</label>
                            <NumberInput
                                placeholder="Total Anggaran"
                                value={anggaranForm.totalAnggaran}
                                onChange={val => setAnggaranForm(prev => ({ ...prev, totalAnggaran: val }))}
                                className="form-field"
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{
                                textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                            }}>Keterangan (opsional)</label>
                            <input
                                type="text"
                                placeholder="Keterangan"
                                value={anggaranForm.keterangan}
                                onChange={e => setAnggaranForm(prev => ({ ...prev, keterangan: e.target.value }))}
                                className="form-field"
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                        <button type="submit" style={{
                            padding: '10px 20px', backgroundColor: 'var(--btn-primary-bg)',
                            color: 'var(--btn-primary-text)', border: 'none',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                        }}>
                            Simpan Anggaran
                        </button>
                    </div>
                </form>
            )}
        </>
    );
};
