import React from 'react';
import { BlokSidebar } from './BlokSidebar';
import { MenuTab } from './MenuTab';
import { AlergiTab } from './AlergiTab';
import { OrganoleptikTab } from './OrganoleptikTab';
import {
    formatDate as defaultFormatDate,
    getTanggalMusnah as defaultGetTanggalMusnah,
    fieldLabel as defaultFieldLabel,
    buttonStyle as defaultButtonStyle
} from './helpers';

export const BlokWorkspace = ({
    menu,
    editable,
    activeBlokByMenu,
    setActiveBlokByMenu,
    activeTabByBlok,
    setActiveTabByBlok,
    selectedKelompokUmurId,
    setSelectedKelompokUmurId,
    kelompokUmur,
    menuItemsByBlok,
    bahanByMenuItem,
    targetGiziByBlok,
    batasHargaMap,
    getBlokStatus,
    getBlokTotalHarga,
    sumGizi,
    deleteBlok,
    addBlok,
    // props for MenuTab / BahanPanel
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
    // props for AlergiTab
    alergiByBlok,
    alergiForm,
    setAlergiField,
    addAlergi,
    deleteAlergi,
    // props for OrganoleptikTab
    organoleptikByBlok,
    organoleptikForm,
    setOrganoleptikField,
    addOrganoleptik,
    formatDate = defaultFormatDate,
    getTanggalMusnah = defaultGetTanggalMusnah,
    fieldLabel = defaultFieldLabel,
    buttonStyle = defaultButtonStyle,
    toast
}) => {
    const activeBlokId = activeBlokByMenu[menu.id] || menu.blok[0]?.id || '';
    const activeBlok = menu.blok.find(blok => blok.id === activeBlokId);

    const totalBlok = activeBlok ? getBlokTotalHarga(activeBlok.id) : 0;
    const jenisPorsi = activeBlok?.kelompokUmurMenu?.kategoriPenerima?.[0]?.jenisPorsi;
    const batasMaksimal = jenisPorsi ? (batasHargaMap[jenisPorsi] || 0) : 0;
    const isOverBatas = batasMaksimal > 0 && totalBlok > batasMaksimal;
    const badgeColor = isOverBatas ? 'var(--color-danger)' : 'var(--color-success)';

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
            <BlokSidebar
                menu={menu}
                editable={editable}
                activeBlokId={activeBlokId}
                setActiveBlokByMenu={setActiveBlokByMenu}
                getBlokStatus={getBlokStatus}
                getBlokTotalHarga={getBlokTotalHarga}
                deleteBlok={deleteBlok}
                addBlok={addBlok}
                selectedKelompokUmurId={selectedKelompokUmurId}
                setSelectedKelompokUmurId={setSelectedKelompokUmurId}
                kelompokUmur={kelompokUmur}
                buttonStyle={buttonStyle}
            />

            <main style={{ minWidth: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, backgroundColor: 'var(--bg-elevated)' }}>
                {!activeBlok ? (
                    <div style={{ color: 'var(--text-muted)' }}>Pilih atau tambah kelompok umur terlebih dahulu.</div>
                ) : (
                    <>
                        <div style={{
                            position: 'sticky',
                            top: 72,
                            zIndex: 3,
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '12px 24px',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            paddingBottom: 14,
                            marginBottom: 14,
                            borderBottom: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-elevated)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Blok aktif</div>
                                    <h4 style={{ margin: 0, color: 'var(--text)' }}>{activeBlok.kelompokUmurMenu?.nama || activeBlok.kelompokUmurMenuId}</h4>
                                </div>
                                {batasMaksimal > 0 && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '4px 10px',
                                        borderRadius: 'var(--radius-sm)',
                                        backgroundColor: isOverBatas ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: badgeColor,
                                        fontWeight: 700,
                                        fontSize: 13,
                                        border: `1px solid ${isOverBatas ? 'var(--color-danger)' : 'var(--color-success)'}`,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        Total: Rp{totalBlok.toLocaleString('id-ID')} / Rp{batasMaksimal.toLocaleString('id-ID')}
                                    </div>
                                )}
                            </div>
                            {(() => {
                                const gizi = sumGizi(menuItemsByBlok, activeBlokId);
                                const target = targetGiziByBlok[activeBlokId];
                                return (
                                    <div style={{ marginTop: 12, padding: 12, background: 'linear-gradient(to right, #eff6ff, #fff)', borderRadius: 8, border: '1px solid #bfdbfe', width: '100%' }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>📊 Total Gizi Blok Ini</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, fontSize: 12 }}>
                                            <div style={{ fontWeight: 600, color: '#6b7280' }}>Komponen</div>
                                            <div style={{ fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>Realisasi</div>
                                            <div style={{ fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>Target</div>
                                            <div style={{ fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>Gap</div>
                                            {[
                                                { label: 'Energi', key: 'energiKkal', satuan: 'kkal', targetKey: 'targetEnergi' },
                                                { label: 'Protein', key: 'proteinGr', satuan: 'g', targetKey: 'targetProtein' },
                                                { label: 'Lemak', key: 'lemakGr', satuan: 'g', targetKey: 'targetLemak' },
                                                { label: 'Karbo', key: 'karbohidratGr', satuan: 'g', targetKey: 'targetKarbohidrat' },
                                                { label: 'Serat', key: 'seratGr', satuan: 'g', targetKey: 'targetSerat' },
                                            ].map(k => {
                                                const real = Math.round(gizi[k.key] || 0);
                                                const tgt = target ? Math.round(target[k.targetKey] || 0) : null;
                                                const gap = tgt !== null ? real - tgt : null;
                                                let gapColor = '#9ca3af';
                                                let gapIcon = '-';
                                                if (gap !== null && gap > 0) { gapColor = '#d97706'; gapIcon = '+' + gap; }
                                                else if (gap !== null && gap < 0) { gapColor = '#dc2626'; gapIcon = gap; }
                                                else if (gap === 0) { gapColor = '#16a34a'; gapIcon = '0'; }
                                                return (
                                                    <React.Fragment key={k.key}>
                                                        <div style={{ color: '#374151' }}>{k.label}</div>
                                                        <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>{real} {k.satuan}</div>
                                                        <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>{tgt !== null ? tgt + ' ' + k.satuan : '-'}</div>
                                                        <div style={{ textAlign: 'right', fontFamily: 'monospace', color: gapColor }}>{gapIcon}</div>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    ['menu', 'Menu & Bahan'],
                                    ['alergi', 'Alergi'],
                                    ['organoleptik', 'Organoleptik']
                                ].map(([key, label]) => (
                                    <button key={key} type="button" onClick={() => setActiveTabByBlok(prev => ({ ...prev, [activeBlok.id]: key }))} style={{ padding: '8px 12px', border: (activeTabByBlok[activeBlok.id] || 'menu') === key ? '1px solid var(--btn-primary-bg)' : '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: (activeTabByBlok[activeBlok.id] || 'menu') === key ? 'rgba(59,130,246,0.08)' : 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {(activeTabByBlok[activeBlok.id] || 'menu') === 'menu' && (
                            <MenuTab
                                blok={activeBlok}
                                editable={editable}
                                menu={menu}
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
                        )}
                        {activeTabByBlok[activeBlok.id] === 'alergi' && (
                            <AlergiTab
                                blok={activeBlok}
                                editable={editable}
                                alergiByBlok={alergiByBlok}
                                alergiForm={alergiForm}
                                setAlergiField={setAlergiField}
                                addAlergi={addAlergi}
                                deleteAlergi={deleteAlergi}
                                fieldLabel={fieldLabel}
                                buttonStyle={buttonStyle}
                            />
                        )}
                        {activeTabByBlok[activeBlok.id] === 'organoleptik' && (
                            <OrganoleptikTab
                                blok={activeBlok}
                                editable={editable}
                                organoleptikByBlok={organoleptikByBlok}
                                organoleptikForm={organoleptikForm}
                                setOrganoleptikField={setOrganoleptikField}
                                addOrganoleptik={addOrganoleptik}
                                formatDate={formatDate}
                                getTanggalMusnah={getTanggalMusnah}
                                fieldLabel={fieldLabel}
                                buttonStyle={buttonStyle}
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    );
};
