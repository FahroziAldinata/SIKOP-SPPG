import React from 'react';
import { renderStatus } from '../../ui/Table';
import { BlokWorkspace } from './BlokWorkspace';
import { PengirimanPanel } from './PengirimanPanel';
import {
    formatDate as defaultFormatDate,
    fieldLabel as defaultFieldLabel,
    buttonStyle as defaultButtonStyle
} from './helpers';

export const MenuHarianWorkspace = ({
    menu,
    activePeriod,
    expandedMenus,
    setExpandedMenus,
    isEditableMenu,
    formatDate = defaultFormatDate,
    triggerAjukanMenu,
    fieldLabel = defaultFieldLabel,
    buttonStyle = defaultButtonStyle,
    toast,
    // props for BlokWorkspace
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
    alergiByBlok,
    alergiForm,
    setAlergiField,
    addAlergi,
    deleteAlergi,
    organoleptikByBlok,
    organoleptikForm,
    setOrganoleptikField,
    addOrganoleptik,
    getTanggalMusnah,
    // props for PengirimanPanel
    pengirimanByMenu,
    pengirimanForm,
    kendaraanList,
    kategoriList,
    handleStartEditPengiriman,
    addPengiriman,
    deletePengiriman,
    setPengirimanForm
}) => {
    const editable = isEditableMenu(menu);
    const isDetailExpanded = expandedMenus[menu.id] !== undefined ? expandedMenus[menu.id] : true;

    return (
        <section key={menu.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)', overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span
                        onClick={() => setExpandedMenus(prev => ({ ...prev, [menu.id]: !isDetailExpanded }))}
                        style={{
                            fontSize: 16,
                            cursor: 'pointer',
                            userSelect: 'none',
                            color: 'var(--text-muted)',
                            transform: isDetailExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            display: 'inline-block',
                            paddingRight: 6
                        }}
                    >
                        ▸
                    </span>
                    <div>{fieldLabel('Periode')}<strong>{activePeriod ? `${activePeriod.tanggalMulai.split('T')[0]} - ${activePeriod.tanggalSelesai.split('T')[0]}` : '-'}</strong></div>
                    <div>{fieldLabel('Tanggal')}<strong>{formatDate(menu.tanggal)}</strong></div>
                    <div>{fieldLabel('Status')}{renderStatus(menu.status)}</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" disabled={!editable} onClick={() => toast.success('Draft tersimpan melalui setiap aksi tambah/simpan.')} style={buttonStyle('secondary', !editable)}>Simpan Draft</button>
                    <button type="button" disabled={!editable} onClick={() => triggerAjukanMenu(menu.id)} style={buttonStyle('primary', !editable)}>Ajukan</button>
                </div>
            </div>
            <div
                style={{
                    maxHeight: isDetailExpanded ? '5000px' : '0px',
                    transition: 'max-height 0.4s ease-in-out',
                    overflow: 'hidden'
                }}
            >
                <div style={{ padding: 18 }}>
                    {!editable && (
                        <div style={{ marginBottom: 14, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                            Mode baca saja. Menu dengan status {menu.status} tidak dapat diubah oleh Ahli Gizi.
                        </div>
                    )}
                    <BlokWorkspace
                        menu={menu}
                        editable={editable}
                        activeBlokByMenu={activeBlokByMenu}
                        setActiveBlokByMenu={setActiveBlokByMenu}
                        activeTabByBlok={activeTabByBlok}
                        setActiveTabByBlok={setActiveTabByBlok}
                        selectedKelompokUmurId={selectedKelompokUmurId}
                        setSelectedKelompokUmurId={setSelectedKelompokUmurId}
                        kelompokUmur={kelompokUmur}
                        menuItemsByBlok={menuItemsByBlok}
                        bahanByMenuItem={bahanByMenuItem}
                        targetGiziByBlok={targetGiziByBlok}
                        batasHargaMap={batasHargaMap}
                        getBlokStatus={getBlokStatus}
                        getBlokTotalHarga={getBlokTotalHarga}
                        sumGizi={sumGizi}
                        deleteBlok={deleteBlok}
                        addBlok={addBlok}
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
                        alergiByBlok={alergiByBlok}
                        alergiForm={alergiForm}
                        setAlergiField={setAlergiField}
                        addAlergi={addAlergi}
                        deleteAlergi={deleteAlergi}
                        organoleptikByBlok={organoleptikByBlok}
                        organoleptikForm={organoleptikForm}
                        setOrganoleptikField={setOrganoleptikField}
                        addOrganoleptik={addOrganoleptik}
                        formatDate={formatDate}
                        getTanggalMusnah={getTanggalMusnah}
                        fieldLabel={fieldLabel}
                        buttonStyle={buttonStyle}
                        toast={toast}
                    />
                    <PengirimanPanel
                        menu={menu}
                        editable={editable}
                        pengirimanByMenu={pengirimanByMenu}
                        pengirimanForm={pengirimanForm}
                        kendaraanList={kendaraanList}
                        kategoriList={kategoriList}
                        handleStartEditPengiriman={handleStartEditPengiriman}
                        addPengiriman={addPengiriman}
                        deletePengiriman={deletePengiriman}
                        setPengirimanForm={setPengirimanForm}
                        fieldLabel={fieldLabel}
                        buttonStyle={buttonStyle}
                    />
                </div>
            </div>
        </section>
    );
};
