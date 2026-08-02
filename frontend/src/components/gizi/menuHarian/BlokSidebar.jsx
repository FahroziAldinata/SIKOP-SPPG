import React from 'react';
import Dropdown from '../../Dropdown';
import { Trash2 } from 'lucide-react';
import { buttonStyle as defaultButtonStyle } from './helpers';

export const BlokSidebar = ({
    menu,
    editable,
    activeBlokId,
    setActiveBlokByMenu,
    getBlokStatus,
    getBlokTotalHarga,
    deleteBlok,
    addBlok,
    selectedKelompokUmurId,
    setSelectedKelompokUmurId,
    kelompokUmur = [],
    buttonStyle = defaultButtonStyle
}) => {
    return (
        <aside style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--bg-elevated)' }}>
            <div style={{ padding: 14, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>Kelompok Umur</div>
            {menu.blok.length === 0 ? (
                <div style={{ padding: 14, color: 'var(--text-muted)' }}>Belum ada blok.</div>
            ) : menu.blok.map(blok => {
                const status = getBlokStatus(blok);
                const active = blok.id === activeBlokId;
                const blokTotal = getBlokTotalHarga(blok.id);

                if (!active) {
                    return (
                        <button
                            key={blok.id}
                            type="button"
                            onClick={() => setActiveBlokByMenu(prev => ({ ...prev, [menu.id]: blok.id }))}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                border: 'none',
                                borderBottom: '1px solid var(--border)',
                                backgroundColor: 'transparent',
                                color: 'var(--text)',
                                cursor: 'pointer',
                                fontSize: 13
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 600 }}>{blok.kelompokUmurMenu?.nama || blok.kelompokUmurMenuId}</span>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: status.color, flexShrink: 0 }} title={status.label} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rp{blokTotal.toLocaleString('id-ID')}</span>
                                {editable && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteBlok(blok.id);
                                        }}
                                        style={{ color: 'var(--color-danger)', display: 'inline-flex', padding: 2 }}
                                    >
                                        <Trash2 size={12} />
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                }

                return (
                    <div key={blok.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(59,130,246,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '12px 14px 6px 14px', alignItems: 'center' }}>
                            <strong style={{ color: 'var(--text)', fontSize: 14 }}>{blok.kelompokUmurMenu?.nama || blok.kelompokUmurMenuId}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--btn-primary-bg)' }}>
                                    Rp{blokTotal.toLocaleString('id-ID')}
                                </span>
                                {editable && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteBlok(blok.id);
                                        }}
                                        style={{ color: 'var(--color-danger)', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={14} />
                                    </span>
                                )}
                            </div>
                        </div>
                        <div style={{ padding: '0 14px 12px 14px', fontSize: 12, color: status.color }}>
                            {status.label}
                        </div>
                    </div>
                );
            })}
            {editable && (
                <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                    <Dropdown value={selectedKelompokUmurId} onChange={setSelectedKelompokUmurId} options={kelompokUmur.map(k => ({ value: k.id, label: k.nama }))} />
                    <button type="button" onClick={() => addBlok(menu.id)} style={buttonStyle('primary')}>Tambah Blok</button>
                </div>
            )}
        </aside>
    );
};
