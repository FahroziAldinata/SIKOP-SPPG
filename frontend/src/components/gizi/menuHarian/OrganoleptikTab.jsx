import React from 'react';
import { DatePicker } from '../../DatePicker';
import {
    formatDate as defaultFormatDate,
    getTanggalMusnah as defaultGetTanggalMusnah,
    fieldLabel as defaultFieldLabel,
    buttonStyle as defaultButtonStyle
} from './helpers';

export const OrganoleptikTab = ({
    blok,
    editable,
    organoleptikByBlok,
    organoleptikForm,
    setOrganoleptikField,
    addOrganoleptik,
    formatDate = defaultFormatDate,
    getTanggalMusnah = defaultGetTanggalMusnah,
    fieldLabel = defaultFieldLabel,
    buttonStyle = defaultButtonStyle
}) => {
    const current = organoleptikByBlok[blok.id];
    if (current) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                {[
                    ['Rasa', current.rasa],
                    ['Aroma', current.aroma],
                    ['Tekstur', current.tekstur],
                    ['Suhu Saji', current.suhuSaji],
                    ['Jumlah Ompreng', current.jumlahOmpreng],
                    ['Tanggal Uji', current.ujiPadaTanggal ? formatDate(current.ujiPadaTanggal) : '-'],
                    ['Tanggal Musnah', current.tanggalMusnah ? formatDate(current.tanggalMusnah) : '-']
                ].map(([label, value]) => (
                    <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                        <strong>{value || '-'}</strong>
                    </div>
                ))}
                {current.catatan && <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)' }}>{current.catatan}</div>}
            </div>
        );
    }

    if (!editable) return <div style={{ color: 'var(--text-muted)' }}>Belum ada uji organoleptik.</div>;

    const formState = organoleptikForm[blok.id] || {};
    const computedTanggalMusnah = formState.ujiPadaTanggal ? getTanggalMusnah(formState.ujiPadaTanggal) : '-';

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr)) auto', gap: 10, alignItems: 'end' }}>
            {[
                ['rasa', 'Rasa', 'text'],
                ['aroma', 'Aroma', 'text'],
                ['tekstur', 'Tekstur', 'text'],
                ['suhuSaji', 'Suhu Saji', 'text'],
                ['jumlahOmpreng', 'Jumlah Ompreng', 'number'],
                ['catatan', 'Catatan', 'text']
            ].map(([field, label, type]) => (
                <div key={field}>{fieldLabel(label)}<input className="form-field" type={type} value={formState[field] || ''} onChange={e => setOrganoleptikField(blok.id, field, e.target.value)} /></div>
            ))}
            <div>
                {fieldLabel('Tgl Uji')}
                <DatePicker value={formState.ujiPadaTanggal || ''} onChange={val => setOrganoleptikField(blok.id, 'ujiPadaTanggal', val)} />
            </div>
            <div>
                {fieldLabel('Tanggal Musnah')}
                <input className="form-field" type="text" value={computedTanggalMusnah} readOnly style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }} />
            </div>
            <button type="button" onClick={() => addOrganoleptik(blok.id)} style={buttonStyle('primary')}>Simpan Uji</button>
        </div>
    );
};
