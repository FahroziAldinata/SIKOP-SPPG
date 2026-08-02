import React from 'react';
import Dropdown from '../../Dropdown';
import { MenuTab } from './MenuTab';
import {
    formatDate as defaultFormatDate,
    fieldLabel as defaultFieldLabel,
    buttonStyle as defaultButtonStyle
} from './helpers';

export const RiwayatMenu = ({
    filteredRiwayatBlocks = [],
    riwayatTanggalFilter,
    setRiwayatTanggalFilter,
    riwayatKelompokUmurFilter,
    setRiwayatKelompokUmurFilter,
    riwayatTanggalOptions,
    riwayatKelompokUmurOptions,
    expandedRiwayatMenuId,
    setExpandedRiwayatMenuId,
    formatDate = defaultFormatDate,
    fieldLabel = defaultFieldLabel,
    buttonStyle = defaultButtonStyle,
    // props for MenuTab
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
    toast
}) => {
    return (
        <section style={{ border: '1px solid var(--border)', padding: 24, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)', marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text)' }}>Riwayat Menu (Disetujui)</h3>
            
            {/* Filter Card */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg)', marginBottom: 20 }}>
                <div style={{ minWidth: 200, flex: 1 }}>
                    {fieldLabel('Filter Tanggal')}
                    <Dropdown
                        value={riwayatTanggalFilter}
                        onChange={setRiwayatTanggalFilter}
                        options={riwayatTanggalOptions}
                    />
                </div>
                <div style={{ minWidth: 200, flex: 1 }}>
                    {fieldLabel('Filter Kelompok Umur')}
                    <Dropdown
                        value={riwayatKelompokUmurFilter}
                        onChange={setRiwayatKelompokUmurFilter}
                        options={riwayatKelompokUmurOptions}
                    />
                </div>
            </div>

            {/* List of Approved Blocks */}
            {filteredRiwayatBlocks.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    Tidak ada riwayat menu yang cocok dengan filter.
                </div>
            ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', padding: 16, maxHeight: 300, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredRiwayatBlocks.map(b => {
                        const isExpanded = expandedRiwayatMenuId === b.blokId;
                        return (
                            <div key={b.blokId} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg)', overflow: 'hidden' }}>
                                <div
                                    onClick={() => setExpandedRiwayatMenuId(isExpanded ? null : b.blokId)}
                                    style={{
                                        padding: '12px 16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        backgroundColor: 'var(--bg-elevated)',
                                        userSelect: 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: 14,
                                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s ease',
                                            display: 'inline-block',
                                            color: 'var(--text-muted)'
                                        }}>
                                            ▸
                                        </span>
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{formatDate(b.tanggal)}</span>
                                            <span style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 12, fontSize: 11, backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--btn-primary-bg)', fontWeight: 700 }}>
                                                {b.kelompokUmurNama}
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 400 }}>
                                            {b.menuSummary}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                                        DISETUJUI
                                    </span>
                                </div>
                                <div
                                    style={{
                                        maxHeight: isExpanded ? '2000px' : '0px',
                                        transition: 'max-height 0.3s ease-in-out',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ padding: 16, borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                                        <div style={{ marginBottom: 14, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: 12 }}>
                                            Mode baca saja. Menu ini telah disetujui oleh Kepala SPPG.
                                        </div>
                                        <MenuTab
                                            blok={b.rawBlok}
                                            editable={false}
                                            menu={b.rawMenu}
                                            menuItemsByBlok={menuItemsByBlok}
                                            bahanByMenuItem={bahanByMenuItem}
                                            bahanForm={bahanForm}
                                            bahanPokokList={bahanPokokList}
                                            selectedMenuItemByBlok={selectedMenuItemByBlok}
                                            expandedComponents={expandedComponents}
                                            komponenInput={komponenInput}
                                            namaMenuInput={namaMenuInput}
                                            setSelectedMenuItemByBlok={setSelectedMenuItemByBlok}
                                            setKomponenInput={setKomponenInput}
                                            setNamaMenuInput={setNamaMenuInput}
                                            setExpandedComponents={setExpandedComponents}
                                            setBahanField={setBahanField}
                                            addBahan={addBahan}
                                            addMenuItem={addMenuItem}
                                            applyMasterMenu={applyMasterMenu}
                                            getBahanName={getBahanName}
                                            getBahanLabel={getBahanLabel}
                                            KOMPONEN_OPTIONS={KOMPONEN_OPTIONS}
                                            KOMPONEN_LABEL={KOMPONEN_LABEL}
                                            fieldLabel={fieldLabel}
                                            buttonStyle={buttonStyle}
                                            toast={toast}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                </div>
            )}
        </section>
    );
};
