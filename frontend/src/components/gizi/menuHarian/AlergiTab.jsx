import React from 'react';
import { NumberInput } from '../../ui/NumberInput';
import { FieldButton } from '../../ui/FieldButton';
import { Trash2 } from 'lucide-react';
import { fieldLabel as defaultFieldLabel, buttonStyle as defaultButtonStyle } from './helpers';

export const AlergiTab = ({
    blok,
    editable,
    alergiByBlok,
    alergiForm,
    setAlergiField,
    addAlergi,
    deleteAlergi,
    fieldLabel = defaultFieldLabel,
    buttonStyle = defaultButtonStyle
}) => {
    const existingAlergiList = alergiByBlok[blok.id] || [];
    const existingTotal = existingAlergiList.reduce((sum, item) => sum + Number(item.jumlahSiswa || 0), 0);
    const inputJumlahRaw = alergiForm[blok.id]?.jumlahSiswa;
    const inputJumlah = (inputJumlahRaw === '' || inputJumlahRaw === undefined || isNaN(Number(inputJumlahRaw))) ? 0 : Number(inputJumlahRaw);
    const totalAlergiRealtime = existingTotal + inputJumlah;
    const totalPenerima = blok.totalPenerima !== undefined ? blok.totalPenerima : 0;
    const isOverload = totalAlergiRealtime > totalPenerima;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8, padding: '10px 14px', backgroundColor: isOverload ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg)', border: `1px solid ${isOverload ? 'var(--color-danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                    Penerima Manfaat Blok: <strong>{totalPenerima} siswa</strong>
                    <span style={{ margin: '0 12px', color: 'var(--border)' }}>|</span>
                    Total Alergi (Real-time): <strong style={{ color: isOverload ? 'var(--color-danger)' : 'var(--text)' }}>{totalAlergiRealtime} siswa</strong>
                </div>
                {isOverload && (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-danger)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 12
                    }}>
                        ⚠️ Warning: Total alergi ({totalAlergiRealtime}) melebihi jumlah penerima ({totalPenerima})!
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {existingAlergiList.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>Belum ada catatan alergi.</div>
                ) : existingAlergiList.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                            <strong>{item.jenisAlergi}</strong> - {item.jumlahSiswa} siswa
                            {item.bahanPengganti ? <span style={{ color: 'var(--text-muted)' }}> - Pengganti: {item.bahanPengganti}</span> : null}
                        </div>
                        {editable && <FieldButton onPress={() => deleteAlergi(blok.id, item.id)}><Trash2 size={14} className="text-red-600" /></FieldButton>}
                    </div>
                ))}
            </div>
            {editable && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr auto', gap: 10, alignItems: 'end' }}>
                    <div>{fieldLabel('Jenis alergi')}<input className="form-field" value={alergiForm[blok.id]?.jenisAlergi || ''} onChange={e => setAlergiField(blok.id, 'jenisAlergi', e.target.value)} /></div>
                    <div>{fieldLabel('Jumlah siswa')}<NumberInput className="form-field" value={alergiForm[blok.id]?.jumlahSiswa === '' || alergiForm[blok.id]?.jumlahSiswa === undefined ? '' : Number(alergiForm[blok.id]?.jumlahSiswa)} onChange={val => setAlergiField(blok.id, 'jumlahSiswa', val)} /></div>
                    <div>{fieldLabel('Bahan pengganti')}<input className="form-field" value={alergiForm[blok.id]?.bahanPengganti || ''} onChange={e => setAlergiField(blok.id, 'bahanPengganti', e.target.value)} /></div>
                    <button type="button" onClick={() => addAlergi(blok.id)} style={buttonStyle('primary')}>Tambah</button>
                </div>
            )}
        </div>
    );
};
