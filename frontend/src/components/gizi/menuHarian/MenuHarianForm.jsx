import React from 'react';
import { DatePicker } from '../../ui/DatePicker';
import { fieldLabel as defaultFieldLabel, buttonStyle as defaultButtonStyle } from './helpers';

export const MenuHarianForm = ({
    tanggal,
    setTanggal,
    create,
    activePeriod,
    items = [],
    fieldLabel = defaultFieldLabel,
    buttonStyle = defaultButtonStyle
}) => {
    return (
        <section style={{ border: '1px solid var(--border)', padding: 24, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)', marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text)' }}>Buat / Pilih Tanggal Menu Harian Aktual</h3>
            <form onSubmit={create} style={{ display: 'flex', gap: 12, alignItems: 'end', maxWidth: 600 }}>
                <div style={{ flex: 1 }}>
                    {fieldLabel('Pilih Tanggal Menu Harian')}
                    <DatePicker
                        value={tanggal}
                        onChange={setTanggal}
                        defaultFocusMonth={activePeriod?.tanggalMulai}
                        required
                        isDateUnavailable={(date) => {
                            const dateStr = date.toString();
                            return items.some(item => item.tanggal.split('T')[0] === dateStr && item.status === 'DISETUJUI');
                        }}
                    />
                </div>
                <button type="submit" style={buttonStyle('primary')}>Buat Menu Harian</button>
            </form>
        </section>
    );
};
