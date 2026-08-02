import React from 'react';
import { NumberInput } from '../../NumberInput';
import { getCategoryOptions } from './constants';

export const KelasFormModal = ({
  kelasModalOpen,
  editingKelas,
  formKelasNama,
  formKelasJumlah,
  setFormKelasNama,
  setFormKelasJumlah,
  handleSubmitKelasForm,
  setKelasModalOpen,
  targetSekolahId,
  expandedSekolahId,
  sekolahList,
  submitting
}) => {
  if (!kelasModalOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        width: '90%',
        maxWidth: '420px',
        boxShadow: 'var(--shadow-hover)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--text)'
        }}>
          {editingKelas ? 'Edit Detail Kelas' : 'Tambah Kelas Baru'}
        </h4>

        <form onSubmit={handleSubmitKelasForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Kategori <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              required
              value={formKelasNama}
              onChange={(e) => setFormKelasNama(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">-- Pilih Kategori --</option>
              {getCategoryOptions(sekolahList.find(s => s.id === (targetSekolahId || expandedSekolahId))?.jenjang).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Jumlah <span style={{ color: 'red' }}>*</span>
            </label>
            <NumberInput
              required
              placeholder="Masukkan jumlah siswa"
              value={formKelasJumlah === '' ? '' : Number(formKelasJumlah)}
              onChange={(val) => setFormKelasJumlah(val)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setKelasModalOpen(false)}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--btn-cancel-bg, #f3f4f6)',
                border: '1px solid var(--btn-cancel-border, #d1d5db)',
                color: 'var(--btn-cancel-text, #374151)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
