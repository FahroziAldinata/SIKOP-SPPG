import React from 'react';
import { MasterMenuModal } from './MasterMenuModal';
import { fieldLabel as defaultFieldLabel, buttonStyle as defaultButtonStyle } from './helpers';

export const MasterMenuSetup = ({
    actualMasterMenuList,
    masterForm,
    showMasterModal,
    submitMasterMenu,
    deleteMasterMenu,
    fetchMasterByHari,
    setMasterForm,
    setShowMasterModal,
    fieldLabel = defaultFieldLabel,
    buttonStyle = defaultButtonStyle
}) => {
    return (
        <section style={{ border: '1px solid var(--border)', padding: 24, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: 'var(--text)' }}>Setup Master Menu</h3>
                <button 
                    type="button" 
                    onClick={() => {
                        setMasterForm({
                            id: '',
                            jalur: 'SISWA',
                            hari: 'SENIN',
                            mingguKe: 1,
                            catatan: '',
                            menuKarbohidrat: '',
                            menuLaukHewani: '',
                            menuLaukNabati: '',
                            menuSayur: '',
                            menuBuah: ''
                        });
                        setShowMasterModal(true);
                        fetchMasterByHari('SISWA', 'SENIN', 1);
                    }}
                    style={buttonStyle('secondary')}
                >
                    📋 Kelola Rencana Master Menu
                </button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Minggu</th>
                            <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Jalur</th>
                            <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Hari</th>
                            <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Karbohidrat</th>
                            <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Lauk Hewani</th>
                            <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Lauk Nabati</th>
                            <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Sayur</th>
                            <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Buah</th>
                            <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Catatan</th>
                            <th style={{ textAlign: 'center', padding: '12px 10px', fontSize: 13, color: 'var(--text-muted)', width: 140 }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {actualMasterMenuList.length === 0 ? (
                            <tr>
                                <td colSpan={10} style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)' }}>
                                    Belum ada rencana master menu. Silakan klik "Kelola Rencana Master Menu" untuk menambahkan.
                                </td>
                            </tr>
                        ) : actualMasterMenuList.map(row => (
                            <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '12px 10px' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        backgroundColor: row.mingguKe === 2 ? 'rgba(168, 85, 247, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                        color: row.mingguKe === 2 ? '#9333ea' : '#2563eb'
                                    }}>
                                        Minggu {row.mingguKe || 1}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 10px' }}><strong>{row.jalur}</strong></td>
                                <td style={{ padding: '12px 10px' }}>{row.hari}</td>
                                <td style={{ padding: '12px 10px' }}>{row.menuKarbohidrat || '-'}</td>
                                <td style={{ padding: '12px 10px' }}>{row.menuLaukHewani || '-'}</td>
                                <td style={{ padding: '12px 10px' }}>{row.menuLaukNabati || '-'}</td>
                                <td style={{ padding: '12px 10px' }}>{row.menuSayur || '-'}</td>
                                <td style={{ padding: '12px 10px' }}>{row.menuBuah || '-'}</td>
                                <td style={{ padding: '12px 10px', color: row.catatan ? 'var(--text)' : 'var(--text-muted)' }}>{row.catatan || '-'}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setMasterForm({
                                                    id: row.id,
                                                    jalur: row.jalur,
                                                    hari: row.hari,
                                                    mingguKe: row.mingguKe || 1,
                                                    catatan: row.catatan || '',
                                                    menuKarbohidrat: row.menuKarbohidrat || '',
                                                    menuLaukHewani: row.menuLaukHewani || '',
                                                    menuLaukNabati: row.menuLaukNabati || '',
                                                    menuSayur: row.menuSayur || '',
                                                    menuBuah: row.menuBuah || ''
                                                });
                                                setShowMasterModal(true);
                                            }}
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
                                        <button 
                                            type="button" 
                                            onClick={() => deleteMasterMenu(row.id)}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                border: '1px solid #ef4444',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                                color: '#ef4444',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <MasterMenuModal
                showMasterModal={showMasterModal}
                masterForm={masterForm}
                setMasterForm={setMasterForm}
                setShowMasterModal={setShowMasterModal}
                submitMasterMenu={submitMasterMenu}
                deleteMasterMenu={deleteMasterMenu}
                fetchMasterByHari={fetchMasterByHari}
                fieldLabel={fieldLabel}
                buttonStyle={buttonStyle}
            />
        </section>
    );
};
