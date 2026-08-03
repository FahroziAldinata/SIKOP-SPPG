import React from 'react';
import { NumberInput } from '../../ui/NumberInput';

export const AtsSection = ({ ats, setAts }) => {
  return (
    <div className="ui-card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--border)' }}>
      <h4 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Anak Tidak Sekolah (ATS)
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* ATS < 9 Tahun */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '12px' }}>
          <div style={{ flex: '1 1 250px' }}>
            <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Anak Tidak Sekolah Usia &lt; 9 Tahun</strong>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Kategori: ATS_KURANG_9TH (Porsi Kecil)</div>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Laki-laki</label>
              <NumberInput
                required
                className="form-field"
                style={{ width: '100px' }}
                value={ats.ATS_KURANG_9TH.lakiLaki === '' ? '' : Number(ats.ATS_KURANG_9TH.lakiLaki)}
                onChange={(val) => setAts({
                  ...ats,
                  ATS_KURANG_9TH: { ...ats.ATS_KURANG_9TH, lakiLaki: val }
                })}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Perempuan</label>
              <NumberInput
                required
                className="form-field"
                style={{ width: '100px' }}
                value={ats.ATS_KURANG_9TH.perempuan === '' ? '' : Number(ats.ATS_KURANG_9TH.perempuan)}
                onChange={(val) => setAts({
                  ...ats,
                  ATS_KURANG_9TH: { ...ats.ATS_KURANG_9TH, perempuan: val }
                })}
              />
            </div>
          </div>
        </div>

        {/* ATS 9-18 Tahun */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px' }}>
            <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Anak Tidak Sekolah Usia 9 - 18 Tahun</strong>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Kategori: ATS_9_18TH (Porsi Besar)</div>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Laki-laki</label>
              <NumberInput
                required
                className="form-field"
                style={{ width: '100px' }}
                value={ats.ATS_9_18TH.lakiLaki === '' ? '' : Number(ats.ATS_9_18TH.lakiLaki)}
                onChange={(val) => setAts({
                  ...ats,
                  ATS_9_18TH: { ...ats.ATS_9_18TH, lakiLaki: val }
                })}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Perempuan</label>
              <NumberInput
                required
                className="form-field"
                style={{ width: '100px' }}
                value={ats.ATS_9_18TH.perempuan === '' ? '' : Number(ats.ATS_9_18TH.perempuan)}
                onChange={(val) => setAts({
                  ...ats,
                  ATS_9_18TH: { ...ats.ATS_9_18TH, perempuan: val }
                })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
