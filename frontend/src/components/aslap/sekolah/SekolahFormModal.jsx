import React from 'react';
import { JENJANG_OPTIONS } from './constants';

export const SekolahFormModal = ({
  modalOpen,
  editingItem,
  formNama,
  formJenjang,
  formNpsn,
  formAlamat,
  setFormNama,
  setFormJenjang,
  setFormNpsn,
  setFormAlamat,
  handleSubmitForm,
  setModalOpen,
  submitting
}) => {
  if (!modalOpen) return null;

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
        maxWidth: '480px',
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
          {editingItem ? 'Edit Sekolah' : 'Tambah Sekolah Baru'}
        </h4>

        <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Nama <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Nama sekolah"
              value={formNama}
              onChange={(e) => setFormNama(e.target.value)}
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
            />
          </div>

          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Jenjang <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              required
              value={formJenjang}
              onChange={(e) => setFormJenjang(e.target.value)}
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
              <option value="">-- Pilih Jenjang --</option>
              {JENJANG_OPTIONS.map(j => (
                <option key={j} value={j}>{j}</option>
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
              NPSN
            </label>
            <input
              type="text"
              placeholder="8 digit angka"
              maxLength={8}
              value={formNpsn}
              onChange={(e) => setFormNpsn(e.target.value.replace(/\D/g, ''))}
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
            />
          </div>

          <div>
            <label style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Alamat
            </label>
            <textarea
              rows={3}
              placeholder="Alamat lengkap sekolah"
              value={formAlamat}
              onChange={(e) => setFormAlamat(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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
