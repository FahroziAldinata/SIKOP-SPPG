import React from 'react';
import Dropdown from '../../Dropdown';
import { getBahanName as defaultGetBahanName, getBahanLabel as defaultGetBahanLabel, buttonStyle as defaultButtonStyle } from './helpers';

export const BahanPanel = ({
    blok,
    editable,
    menuItemsByBlok,
    bahanByMenuItem,
    bahanForm,
    bahanPokokList,
    selectedMenuItemByBlok,
    setBahanField,
    addBahan,
    getBahanName = defaultGetBahanName,
    getBahanLabel = defaultGetBahanLabel,
    buttonStyle = defaultButtonStyle,
    KOMPONEN_LABEL
}) => {
    const selectedId = selectedMenuItemByBlok[blok.id];
    const item = (menuItemsByBlok[blok.id] || []).find(menuItem => menuItem.id === selectedId);
    if (!item) {
        return <div style={{ padding: 16, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>Klik card menu item untuk mengisi bahan.</div>;
    }
    const bahanRows = bahanByMenuItem[item.id] || [];
    const form = bahanForm[item.id] || {};

    return (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tabel bahan</div>
                    <strong>{item.namaMenu}</strong>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.komponen ? KOMPONEN_LABEL[item.komponen] : 'Tanpa komponen'}</span>
            </div>
            <div style={{ overflowX: 'auto', position: 'relative' }}>
                <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {['Bahan', 'Bersih', 'Hitung/Porsi', 'URT', 'BDD', 'Harga', 'Basis', 'Total'].map(label => (
                                <th key={label} style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {bahanRows.map(bahan => (
                            <React.Fragment key={bahan.id}>
                            <tr>
                                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{getBahanName(bahan, bahanPokokList)}</td>
                                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.beratBersihGr}</td>
                                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.jumlahHitungan !== null && bahan.jumlahHitungan !== undefined ? Number(bahan.jumlahHitungan).toString() : '-'}</td>
                                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.beratURT || '-'}</td>
                                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.bddPersen}</td>
                                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>Rp{Number(bahan.hargaSatuan || 0).toLocaleString('id-ID')}</span>
                                        {bahan.isFallback && (
                                            <span 
                                                title="Harga dari periode sebelumnya, belum diupdate Mitra" 
                                                style={{ 
                                                    color: '#d97706', 
                                                    cursor: 'help',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    fontSize: 14
                                                }}
                                            >
                                                ⚠️
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.beratSatuanGr}</td>
                                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Rp{Number(bahan.totalHargaBahan || 0).toLocaleString('id-ID')}</td>
                            </tr>
                            <tr>
                              <td colSpan={8} style={{ padding: '2px 8px 10px', borderBottom: '1px solid var(--border)', fontSize: 11, color: '#6b7280' }}>
                                Energi: {bahan.energiKkal || 0} kkal &nbsp;|&nbsp; Protein: {bahan.proteinGr || 0} g &nbsp;|&nbsp; Lemak: {bahan.lemakGr || 0} g &nbsp;|&nbsp; Karbo: {bahan.karbohidratGr || 0} g &nbsp;|&nbsp; Serat: {bahan.seratGr || 0} g
                              </td>
                            </tr>
                            </React.Fragment>
                        ))}
                        {editable && (
                            <>
                            <tr>
                                <td>
                                    <Dropdown
                                        style={{ minWidth: 180 }}
                                        value={form.bahanPokokId ?? bahanPokokList[0]?.id ?? ''}
                                        onChange={val => setBahanField(item.id, 'bahanPokokId', val)}
                                        options={bahanPokokList.length === 0 ? [{ value: '', label: '-- Bahan Pokok kosong --' }] : bahanPokokList.map(bp => ({ value: bp.id, label: getBahanLabel(bp) }))}
                                    />
                                </td>
                                <td><input className="form-field" type="number" style={{ minWidth: 70 }} value={form.beratBersihGr || ''} onChange={e => setBahanField(item.id, 'beratBersihGr', e.target.value)} /></td>
                                <td>
                                    <input 
                                        className="form-field" 
                                        type="number" 
                                        step="0.01"
                                        style={{ minWidth: 90 }} 
                                        placeholder="Unit/Porsi" 
                                        title="Jumlah per porsi (opsional, isi kalau bahan dihitung per unit — misal butir/buah)"
                                        value={form.jumlahHitungan || ''} 
                                        onChange={e => setBahanField(item.id, 'jumlahHitungan', e.target.value)} 
                                    />
                                </td>
                                <td><input className="form-field" style={{ minWidth: 70 }} value={form.beratURT || ''} onChange={e => setBahanField(item.id, 'beratURT', e.target.value)} /></td>
                                <td><input className="form-field" type="number" style={{ minWidth: 60 }} value={form.bddPersen || ''} onChange={e => setBahanField(item.id, 'bddPersen', e.target.value)} /></td>
                                <td><input className="form-field" style={{ minWidth: 80, backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }} disabled placeholder="Auto" value="" /></td>
                                <td><input className="form-field" type="number" style={{ minWidth: 70 }} value={form.beratSatuanGr || ''} onChange={e => setBahanField(item.id, 'beratSatuanGr', e.target.value)} /></td>
                                <td style={{ color: 'var(--text-muted)' }}>-</td>
                                <td><button type="button" onClick={() => addBahan(item.id)} style={buttonStyle('primary')}>Tambah</button></td>
                            </tr>
                            <tr>
                              <td colSpan={8} style={{ padding: '2px 8px 10px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                  <label style={{ fontSize: 11, color: '#6b7280' }}>Energi: <input className="form-field" type="number" style={{ width: 70 }} value={form.energiKkal || ''} onChange={e => setBahanField(item.id, 'energiKkal', e.target.value)} /></label>
                                  <label style={{ fontSize: 11, color: '#6b7280' }}>Protein: <input className="form-field" type="number" style={{ width: 60 }} value={form.proteinGr || ''} onChange={e => setBahanField(item.id, 'proteinGr', e.target.value)} /></label>
                                  <label style={{ fontSize: 11, color: '#6b7280' }}>Lemak: <input className="form-field" type="number" style={{ width: 60 }} value={form.lemakGr || ''} onChange={e => setBahanField(item.id, 'lemakGr', e.target.value)} /></label>
                                  <label style={{ fontSize: 11, color: '#6b7280' }}>Karbo: <input className="form-field" type="number" style={{ width: 60 }} value={form.karbohidratGr || ''} onChange={e => setBahanField(item.id, 'karbohidratGr', e.target.value)} /></label>
                                  <label style={{ fontSize: 11, color: '#6b7280' }}>Serat: <input className="form-field" type="number" style={{ width: 60 }} value={form.seratGr || ''} onChange={e => setBahanField(item.id, 'seratGr', e.target.value)} /></label>
                                </div>
                              </td>
                            </tr>
                            </>
                        )}
                    </tbody>
                </table>
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 30, background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.05))', pointerEvents: 'none' }} />
            </div>
        </div>
    );
};
