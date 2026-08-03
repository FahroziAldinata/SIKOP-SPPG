import React from 'react';
import Dropdown from '../../ui/Dropdown';
import { fieldLabel as defaultFieldLabel, buttonStyle as defaultButtonStyle } from './helpers';

export const MasterMenuModal = ({
    showMasterModal,
    masterForm,
    setMasterForm,
    setShowMasterModal,
    submitMasterMenu,
    deleteMasterMenu,
    fetchMasterByHari,
    fieldLabel = defaultFieldLabel,
    buttonStyle = defaultButtonStyle
}) => {
    if (!showMasterModal) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: 550,
                padding: 24,
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, color: 'var(--text)' }}>
                        {masterForm.id ? 'Edit Master Menu Mingguan' : 'Tambah Master Menu Mingguan'}
                    </h3>
                    <button 
                        type="button" 
                        onClick={() => setShowMasterModal(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: 20,
                            cursor: 'pointer'
                        }}
                    >
                        &times;
                    </button>
                </div>
                <form onSubmit={submitMasterMenu}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div>
                            {fieldLabel('Minggu')}
                            <Dropdown 
                                value={masterForm.mingguKe} 
                                onChange={val => {
                                    const mk = Number(val);
                                    setMasterForm(prev => ({ ...prev, mingguKe: mk }));
                                    fetchMasterByHari(masterForm.jalur, masterForm.hari, mk);
                                }} 
                                options={[
                                    { value: 1, label: 'Minggu 1' },
                                    { value: 2, label: 'Minggu 2' }
                                ]} 
                            />
                        </div>
                        <div>
                            {fieldLabel('Jalur')}
                            <Dropdown 
                                value={masterForm.jalur} 
                                onChange={val => {
                                    setMasterForm(prev => ({ ...prev, jalur: val }));
                                    fetchMasterByHari(val, masterForm.hari, masterForm.mingguKe);
                                }} 
                                options={[
                                    { value: 'SISWA', label: 'Siswa' },
                                    { value: 'TIGA_B', label: 'Tiga B' }
                                ]} 
                            />
                        </div>
                        <div>
                            {fieldLabel('Hari')}
                            <Dropdown 
                                value={masterForm.hari} 
                                onChange={val => {
                                    setMasterForm(prev => ({ ...prev, hari: val }));
                                    fetchMasterByHari(masterForm.jalur, val, masterForm.mingguKe);
                                }} 
                                options={[
                                    { value: 'SENIN', label: 'Senin' },
                                    { value: 'SELASA', label: 'Selasa' },
                                    { value: 'RABU', label: 'Rabu' },
                                    { value: 'KAMIS', label: 'Kamis' },
                                    { value: 'JUMAT', label: 'Jumat' },
                                    { value: 'SABTU', label: 'Sabtu' }
                                ]} 
                            />
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                        <div>
                            {fieldLabel('Karbohidrat')}
                            <input 
                                className="form-field" 
                                value={masterForm.menuKarbohidrat} 
                                onChange={e => setMasterForm(prev => ({ ...prev, menuKarbohidrat: e.target.value }))} 
                                placeholder="Contoh: Nasi Putih"
                            />
                        </div>
                        <div>
                            {fieldLabel('Lauk Hewani')}
                            <input 
                                className="form-field" 
                                value={masterForm.menuLaukHewani} 
                                onChange={e => setMasterForm(prev => ({ ...prev, menuLaukHewani: e.target.value }))} 
                                placeholder="Contoh: Ayam Goreng"
                            />
                        </div>
                        <div>
                            {fieldLabel('Lauk Nabati')}
                            <input 
                                className="form-field" 
                                value={masterForm.menuLaukNabati} 
                                onChange={e => setMasterForm(prev => ({ ...prev, menuLaukNabati: e.target.value }))} 
                                placeholder="Contoh: Tempe Bacem"
                            />
                        </div>
                        <div>
                            {fieldLabel('Sayur')}
                            <input 
                                className="form-field" 
                                value={masterForm.menuSayur} 
                                onChange={e => setMasterForm(prev => ({ ...prev, menuSayur: e.target.value }))} 
                                placeholder="Contoh: Sayur Sop"
                            />
                        </div>
                        <div>
                            {fieldLabel('Buah')}
                            <input 
                                className="form-field" 
                                value={masterForm.menuBuah} 
                                onChange={e => setMasterForm(prev => ({ ...prev, menuBuah: e.target.value }))} 
                                placeholder="Contoh: Pisang Mas"
                            />
                        </div>
                        <div>
                            {fieldLabel('Catatan (Opsional)')}
                            <input 
                                className="form-field" 
                                value={masterForm.catatan} 
                                onChange={e => setMasterForm(prev => ({ ...prev, catatan: e.target.value }))} 
                                placeholder="Contoh: Menu rotasi minggu ke-2 / Catatan khusus"
                            />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        {masterForm.id && (
                            <button 
                                type="button" 
                                onClick={() => deleteMasterMenu(masterForm.id)}
                                style={{ ...buttonStyle('secondary'), borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                            >
                                Hapus
                            </button>
                        )}
                        <button 
                            type="button" 
                            onClick={() => setShowMasterModal(false)}
                            style={buttonStyle('secondary')}
                        >
                            Batal
                        </button>
                        <button 
                            type="submit" 
                            style={buttonStyle('primary')}
                        >
                            {masterForm.id ? 'Simpan Perubahan' : 'Tambah Master'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
