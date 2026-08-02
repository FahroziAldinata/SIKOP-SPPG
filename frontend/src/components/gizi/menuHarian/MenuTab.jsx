import React from 'react';
import Dropdown from '../../Dropdown';
import { BahanPanel } from './BahanPanel';
import { fieldLabel as defaultFieldLabel, buttonStyle as defaultButtonStyle } from './helpers';

export const MenuTab = ({
    blok,
    editable,
    menu,
    menuItemsByBlok,
    bahanByMenuItem,
    bahanForm,
    bahanPokokList,
    selectedMenuItemByBlok,
    expandedComponents,
    komponenInput,
    namaMenuInput,
    setSelectedMenuItemByBlok,
    setKomponenInput,
    setNamaMenuInput,
    setExpandedComponents,
    setBahanField,
    addBahan,
    addMenuItem,
    applyMasterMenu,
    getBahanName,
    getBahanLabel,
    KOMPONEN_OPTIONS,
    KOMPONEN_LABEL,
    fieldLabel = defaultFieldLabel,
    buttonStyle = defaultButtonStyle,
    toast
}) => {
    const menuItems = menuItemsByBlok[blok.id] || [];
    const tanpaKomponen = menuItems.filter(item => !item.komponen);

    const toggleComponent = (komponen, isCurrentlyExpanded) => {
        setExpandedComponents(prev => ({
            ...prev,
            [`${blok.id}-${komponen}`]: !isCurrentlyExpanded
        }));
    };

    return (
        <>
            {editable && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                    <button
                        type="button"
                        onClick={() => applyMasterMenu(blok, menu)}
                        style={buttonStyle('secondary')}
                    >
                        📋 Isi dari Master
                    </button>
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
                {KOMPONEN_OPTIONS.map(komponen => {
                    const komponenItems = menuItems.filter(item => item.komponen === komponen);
                    const isEmpty = komponenItems.length === 0;
                    const isExpanded = expandedComponents[`${blok.id}-${komponen}`] !== undefined
                        ? expandedComponents[`${blok.id}-${komponen}`]
                        : !isEmpty;

                    return (
                        <div
                            key={komponen}
                            style={{
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--bg)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                alignSelf: 'start'
                            }}
                        >
                            <div
                                onClick={() => toggleComponent(komponen, isExpanded)}
                                style={{
                                    padding: '10px 12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: 'var(--bg-elevated)',
                                    userSelect: 'none',
                                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                                }}
                            >
                                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                                    {KOMPONEN_LABEL[komponen]}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {isEmpty && (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kosong</span>
                                    )}
                                    <span style={{
                                        fontSize: 12,
                                        color: 'var(--text-muted)',
                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease',
                                        display: 'inline-block'
                                    }}>
                                        ▸
                                    </span>
                                </div>
                            </div>
                            <div
                                style={{
                                    maxHeight: isExpanded ? '500px' : '0px',
                                    transition: 'max-height 0.3s ease',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ padding: 12 }}>
                                    {isEmpty ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Belum ada menu.</span>
                                            {editable && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setKomponenInput(prev => ({ ...prev, [blok.id]: komponen }));
                                                        toast?.info?.(`Komponen ${KOMPONEN_LABEL[komponen]} dipilih. Silakan isi nama menu pada form di bawah.`);
                                                    }}
                                                    style={{
                                                        padding: '4px 10px',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        backgroundColor: 'var(--bg-elevated)',
                                                        color: 'var(--text)',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    + Tambah
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: 8 }}>
                                            {komponenItems.map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setSelectedMenuItemByBlok(prev => ({ ...prev, [blok.id]: item.id }))}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: 10,
                                                        border: selectedMenuItemByBlok[blok.id] === item.id ? '1px solid var(--btn-primary-bg)' : '1px solid var(--border)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        backgroundColor: selectedMenuItemByBlok[blok.id] === item.id ? 'rgba(59,130,246,0.08)' : 'var(--bg)',
                                                        color: 'var(--text)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <strong>{item.namaMenu}</strong>
                                                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{(bahanByMenuItem[item.id] || []).length} bahan</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {tanpaKomponen.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {tanpaKomponen.map(item => (
                        <button key={item.id} type="button" onClick={() => setSelectedMenuItemByBlok(prev => ({ ...prev, [blok.id]: item.id }))} style={buttonStyle('secondary')}>
                            {item.namaMenu} - Tanpa komponen
                        </button>
                    ))}
                </div>
            )}

            {editable && (
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 220px auto', gap: 10, alignItems: 'end' }}>
                    <div>
                        {fieldLabel('Nama menu')}
                        <input className="form-field" placeholder="Contoh: Ayam Kecap" value={namaMenuInput[blok.id] || ''} onChange={e => setNamaMenuInput(prev => ({ ...prev, [blok.id]: e.target.value }))} />
                    </div>
                    <div>
                        {fieldLabel('Komponen')}
                        <Dropdown value={komponenInput[blok.id] || ''} onChange={val => setKomponenInput(prev => ({ ...prev, [blok.id]: val }))} options={[{ value: '', label: '-- Komponen (opsional) --' }, ...KOMPONEN_OPTIONS.map(k => ({ value: k, label: KOMPONEN_LABEL[k] }))]} />
                    </div>
                    <button type="button" onClick={() => addMenuItem(blok.id)} style={buttonStyle('primary')}>Tambah Menu</button>
                </div>
            )}

            <BahanPanel
                blok={blok}
                editable={editable}
                menuItemsByBlok={menuItemsByBlok}
                bahanByMenuItem={bahanByMenuItem}
                bahanForm={bahanForm}
                bahanPokokList={bahanPokokList}
                selectedMenuItemByBlok={selectedMenuItemByBlok}
                setBahanField={setBahanField}
                addBahan={addBahan}
                getBahanName={getBahanName}
                getBahanLabel={getBahanLabel}
                buttonStyle={buttonStyle}
                KOMPONEN_LABEL={KOMPONEN_LABEL}
            />
        </>
    );
};
