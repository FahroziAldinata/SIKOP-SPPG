import React from 'react';
import Dropdown from '../../Dropdown';
import { FieldButton } from '../../FieldButton';
import { Trash2 } from 'lucide-react';
import { fieldLabel as defaultFieldLabel, buttonStyle as defaultButtonStyle } from './helpers';

export const PengirimanPanel = ({
    menu,
    editable,
    pengirimanByMenu,
    pengirimanForm,
    kendaraanList,
    kategoriList,
    handleStartEditPengiriman,
    addPengiriman,
    deletePengiriman,
    setPengirimanForm,
    fieldLabel = defaultFieldLabel,
    buttonStyle = defaultButtonStyle
}) => {
    const form = pengirimanForm[menu.id] || {};
    const aktifKendaraan = kendaraanList.filter(k => k.aktif === true);

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 18 }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>Pengiriman Hari Ini</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: editable ? 16 : 0 }}>
                {(pengirimanByMenu[menu.id] || []).length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>Belum ada pengiriman.</div>
                ) : (pengirimanByMenu[menu.id] || []).map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                            <strong>{(p.kategoriPenerima || []).map(k => k.nama).join(', ') || '-'}</strong>
                            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({p.kendaraan?.namaKendaraan || '-'})</span>
                            {p.catatan && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Catatan: {p.catatan}</div>}
                        </div>
                        {editable && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button 
                                    type="button" 
                                    onClick={() => handleStartEditPengiriman(menu.id, p)}
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Edit
                                </button>
                                <FieldButton onPress={() => deletePengiriman(p.id)}><Trash2 size={14} className="text-red-600" /></FieldButton>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {editable && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {form.id ? 'Edit Data Pengiriman' : 'Tambah Data Pengiriman'}
                    </div>
                    
                    <div>
                        {fieldLabel('Kategori Penerima (Pilih minimal 1)')}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px 12px', border: '1px solid var(--border)', padding: 12, borderRadius: 'var(--radius-sm)', maxHeight: 150, overflowY: 'auto', backgroundColor: 'var(--bg)' }}>
                            {kategoriList.map(k => {
                                const isChecked = (form.kategoriIds || []).includes(k.id);
                                return (
                                    <label key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked}
                                            onChange={e => {
                                                const nextIds = e.target.checked
                                                    ? [...(form.kategoriIds || []), k.id]
                                                    : (form.kategoriIds || []).filter(id => id !== k.id);
                                                setPengirimanForm(prev => ({
                                                    ...prev,
                                                    [menu.id]: {
                                                        ...(prev[menu.id] || {}),
                                                        kategoriIds: nextIds
                                                    }
                                                }));
                                            }}
                                        />
                                        {k.nama}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
                        <div>
                            {fieldLabel('Kendaraan')}
                            <Dropdown value={form.kendaraanId || ''} onChange={val => setPengirimanForm(prev => ({ ...prev, [menu.id]: { ...(prev[menu.id] || {}), kendaraanId: val } }))} options={[{ value: '', label: '-- Pilih --' }, ...aktifKendaraan.map(k => ({ value: k.id, label: k.namaKendaraan }))]} />
                        </div>
                        <div>
                            {fieldLabel('Catatan')}
                            <input className="form-field" value={form.catatan || ''} onChange={e => setPengirimanForm(prev => ({ ...prev, [menu.id]: { ...(prev[menu.id] || {}), catatan: e.target.value } }))} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                        {form.id && (
                            <button 
                                type="button" 
                                onClick={() => {
                                    setPengirimanForm(prev => ({
                                        ...prev,
                                        [menu.id]: { id: '', kategoriIds: [], kendaraanId: '', catatan: '' }
                                    }));
                                }}
                                style={buttonStyle('secondary')}
                            >
                                Batal Edit
                            </button>
                        )}
                        <button type="button" onClick={() => addPengiriman(menu.id)} style={buttonStyle('primary')}>
                            {form.id ? 'Simpan Perubahan' : 'Tambah Pengiriman'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
