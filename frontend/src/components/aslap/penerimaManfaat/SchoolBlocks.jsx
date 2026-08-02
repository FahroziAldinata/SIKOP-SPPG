import React from 'react';
import Dropdown from '../../Dropdown';
import { NumberInput } from '../../NumberInput';
import { getDefaultKelas, getKelasLabel, jenjangOptions } from './constants';

export const SchoolBlocks = ({
  formSchools,
  schools,
  schoolOptions,
  schoolKelasMap,
  kelasLoading,
  categoriesById,
  categoriesByKode,
  getDefaultKelas: getDefaultKelasProp,
  getKelasLabel: getKelasLabelProp,
  addSchoolBlock,
  removeSchoolBlock,
  handleSchoolBlockChange,
  handleSchoolValueChange
}) => {
  const resolveGetDefaultKelas = getDefaultKelasProp || getDefaultKelas;
  const resolveGetKelasLabel = getKelasLabelProp || getKelasLabel;

  return (
    <div style={{ marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: '0', color: 'var(--text)', fontSize: '16px', fontWeight: 700 }}>
          Rincian Sekolah Terdaftar
        </h4>
        <button
          type="button"
          onClick={addSchoolBlock}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          + Tambah Sekolah
        </button>
      </div>

      {formSchools.map((block, sIdx) => {
        const selectedS = schools.find(s => s.id === block.sekolahId);
        const jenjang = selectedS ? selectedS.jenjang : block.sekolahJenjang;
        // HAPUS/COMMENT: const categoryKodes = getSchoolCategories(jenjang);
        const kelasList = schoolKelasMap[block.sekolahId] || resolveGetDefaultKelas(jenjang);

        return (
          <div
            key={sIdx}
            id={`school-block-${sIdx}`}
            className="ui-card"
            style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--border)', position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <h5 style={{ margin: '0', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                Blok Sekolah #{sIdx + 1}
              </h5>
              <button
                type="button"
                onClick={() => removeSchoolBlock(sIdx)}
                style={{ color: 'var(--color-danger)', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 600, fontSize: '13px' }}
              >
                Hapus
              </button>
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ flex: '1 1 250px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Pilih Sekolah
                </label>
                <Dropdown
                  style={{ width: '100%' }}
                  value={block.sekolahId}
                  onChange={(val) => handleSchoolBlockChange(sIdx, 'sekolahId', val)}
                  options={schoolOptions}
                />
              </div>

              {block.sekolahId === 'NEW' && (
                <>
                  <div style={{ flex: '2 1 250px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Nama Sekolah Baru *
                    </label>
                    <input
                      id={`school-name-${sIdx}`}
                      type="text"
                      required
                      className="form-field"
                      placeholder="Masukkan nama sekolah..."
                      value={block.sekolahNama}
                      onChange={(e) => handleSchoolBlockChange(sIdx, 'sekolahNama', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Jenjang *
                    </label>
                    <Dropdown
                      style={{ width: '100%' }}
                      value={block.sekolahJenjang}
                      onChange={(val) => handleSchoolBlockChange(sIdx, 'sekolahJenjang', val)}
                      options={jenjangOptions}
                    />
                  </div>
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      NPSN
                    </label>
                    <input
                      type="text"
                      className="form-field"
                      placeholder="8 digit angka"
                      maxLength={8}
                      value={block.npsn || ''}
                      onChange={(e) => handleSchoolBlockChange(sIdx, 'npsn', e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div style={{ flex: '100%' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Alamat
                    </label>
                    <textarea
                      rows={2}
                      className="form-field"
                      placeholder="Alamat sekolah"
                      value={block.alamat || ''}
                      onChange={(e) => handleSchoolBlockChange(sIdx, 'alamat', e.target.value)}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Render inputs based on schoolKelasMap */}
            {(block.sekolahId || block.sekolahNama) && (
              <div style={{ backgroundColor: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rincian Sasaran Per Kelas {jenjang ? `(${jenjang})` : ''}
                </div>
                {kelasLoading && block.sekolahId && block.sekolahId !== 'NEW' && !schoolKelasMap[block.sekolahId] && (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '10px 0' }}>Memuat detail kelas...</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {kelasList.map(k => {
                    const key = k.kategoriId || k.id || k.namaKelas || k.kode;
                    const cat = k.kategori || (k.kategoriId ? categoriesById[k.kategoriId] : (categoriesByKode[k.kode] || categoriesByKode[k.namaKelas]));
                    const label = k.label || k.namaKelas || resolveGetKelasLabel(k.kode || cat?.kode || k.namaKelas, cat?.nama || k.namaKelas || k.nama);
                    const val = block.values[key] || block.values[k.kategoriId] || block.values[k.namaKelas] || block.values[k.kode] || { lakiLaki: 0, perempuan: 0 };

                    return (
                      <div key={key || k.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{label}</span>
                          {cat?.jenisPorsi && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({cat.jenisPorsi === 'KECIL' ? 'Porsi Kecil' : 'Porsi Besar'})</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>L:</span>
                            <NumberInput
                              required
                              className="form-field"
                              style={{ width: '80px', padding: '6px 8px' }}
                              value={val.lakiLaki === '' ? '' : Number(val.lakiLaki)}
                              onChange={(valInput) => handleSchoolValueChange(sIdx, key, 'lakiLaki', valInput)}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>P:</span>
                            <NumberInput
                              required
                              className="form-field"
                              style={{ width: '80px', padding: '6px 8px' }}
                              value={val.perempuan === '' ? '' : Number(val.perempuan)}
                              onChange={(valInput) => handleSchoolValueChange(sIdx, key, 'perempuan', valInput)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
