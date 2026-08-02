import React from 'react';
import { AtsSection } from './AtsSection';
import { SchoolBlocks } from './SchoolBlocks';
import { PosyanduBlocks } from './PosyanduBlocks';

export const PenerimaForm = ({
  editingId,
  handleSubmit,
  ats,
  setAts,
  formSchools,
  schools,
  schoolOptions,
  schoolKelasMap,
  kelasLoading,
  categoriesById,
  categoriesByKode,
  getDefaultKelas,
  getKelasLabel,
  addSchoolBlock,
  removeSchoolBlock,
  handleSchoolBlockChange,
  handleSchoolValueChange,
  formPosyandus,
  posyanduOptions,
  addPosyanduBlock,
  removePosyanduBlock,
  handlePosyanduBlockChange,
  handlePosyanduValueChange,
  resetForm
}) => {
  return (
    <form id="penerima-form" onSubmit={handleSubmit} style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '24px',
      backgroundColor: 'var(--bg-elevated)',
      boxShadow: 'var(--shadow)',
      marginBottom: '30px'
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        {editingId ? 'Edit Data Penerima' : 'Tambah Data Baru'}
      </h3>

      {/* SECTION 1: FIXED ATS SECTION */}
      <AtsSection ats={ats} setAts={setAts} />

      {/* SECTION 3: SCHOOL BLOCKS */}
      <SchoolBlocks
        formSchools={formSchools}
        schools={schools}
        schoolOptions={schoolOptions}
        schoolKelasMap={schoolKelasMap}
        kelasLoading={kelasLoading}
        categoriesById={categoriesById}
        categoriesByKode={categoriesByKode}
        getDefaultKelas={getDefaultKelas}
        getKelasLabel={getKelasLabel}
        addSchoolBlock={addSchoolBlock}
        removeSchoolBlock={removeSchoolBlock}
        handleSchoolBlockChange={handleSchoolBlockChange}
        handleSchoolValueChange={handleSchoolValueChange}
      />

      {/* SECTION 3: POSYANDU BLOCKS */}
      <PosyanduBlocks
        formPosyandus={formPosyandus}
        posyanduOptions={posyanduOptions}
        categoriesByKode={categoriesByKode}
        getKelasLabel={getKelasLabel}
        addPosyanduBlock={addPosyanduBlock}
        removePosyanduBlock={removePosyanduBlock}
        handlePosyanduBlockChange={handlePosyanduBlockChange}
        handlePosyanduValueChange={handlePosyanduValueChange}
      />

      <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <button type="submit" style={{
          padding: '10px 20px',
          backgroundColor: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '14px'
        }}>
          {editingId ? 'Simpan Perubahan' : 'Kirim / Simpan Data'}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} style={{
            padding: '10px 20px',
            backgroundColor: 'var(--btn-cancel-bg)',
            border: '1px solid var(--btn-cancel-border)',
            color: 'var(--btn-cancel-text)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px'
          }}>
            Batal Edit
          </button>
        )}
      </div>
    </form>
  );
};
