import React from 'react';
import Dropdown from '../../Dropdown';
import { NumberInput } from '../../NumberInput';
import { getKelasLabel } from './constants';

export const PosyanduBlocks = ({
  formPosyandus,
  posyanduOptions,
  categoriesByKode,
  getKelasLabel: getKelasLabelProp,
  addPosyanduBlock,
  removePosyanduBlock,
  handlePosyanduBlockChange,
  handlePosyanduValueChange
}) => {
  const resolveGetKelasLabel = getKelasLabelProp || getKelasLabel;

  return (
    <div style={{ marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: '0', color: 'var(--text)', fontSize: '16px', fontWeight: 700 }}>
          Rincian Posyandu / Non-Siswa
        </h4>
        <button
          type="button"
          onClick={addPosyanduBlock}
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
          + Tambah Posyandu
        </button>
      </div>

      {formPosyandus.map((block, pIdx) => {
        const posyanduKodes = ['BUMIL', 'BUSUI', 'BALITA', 'KADER_POSYANDU'];

        return (
          <div
            key={pIdx}
            id={`posyandu-block-${pIdx}`}
            className="ui-card"
            style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--border)', position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <h5 style={{ margin: '0', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                Blok Posyandu #{pIdx + 1}
              </h5>
              <button
                type="button"
                onClick={() => removePosyanduBlock(pIdx)}
                style={{ color: 'var(--color-danger)', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 600, fontSize: '13px' }}
              >
                Hapus
              </button>
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ flex: '1 1 250px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Pilih Posyandu
                </label>
                <Dropdown
                  style={{ width: '100%' }}
                  value={block.posyanduId}
                  onChange={(val) => handlePosyanduBlockChange(pIdx, 'posyanduId', val)}
                  options={posyanduOptions}
                />
              </div>

              {block.posyanduId === 'NEW' && (
                <div style={{ flex: '2 1 250px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Nama Posyandu Baru
                  </label>
                  <input
                    id={`posyandu-name-${pIdx}`}
                    type="text"
                    required
                    className="form-field"
                    placeholder="Masukkan nama posyandu..."
                    value={block.posyanduNama}
                    onChange={(e) => handlePosyanduBlockChange(pIdx, 'posyanduNama', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Render fixed posyandu inputs */}
            {(block.posyanduId || block.posyanduNama) && (
              <div style={{ backgroundColor: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rincian Sasaran Posyandu
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {posyanduKodes.map(kode => {
                    const cat = categoriesByKode[kode];
                    if (!cat) return null;
                    const val = block.values[kode] || { lakiLaki: 0, perempuan: 0 };

                    return (
                      <div key={kode} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{cat.nama}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({cat.jenisPorsi === 'KECIL' ? 'Porsi Kecil' : 'Porsi Besar'})</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>L:</span>
                            <NumberInput
                              required
                              className="form-field"
                              style={{ width: '80px', padding: '6px 8px' }}
                              value={val.lakiLaki === '' ? '' : Number(val.lakiLaki)}
                              onChange={(valInput) => handlePosyanduValueChange(pIdx, kode, 'lakiLaki', valInput)}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>P:</span>
                            <NumberInput
                              required
                              className="form-field"
                              style={{ width: '80px', padding: '6px 8px' }}
                              value={val.perempuan === '' ? '' : Number(val.perempuan)}
                              onChange={(valInput) => handlePosyanduValueChange(pIdx, kode, 'perempuan', valInput)}
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
