import React, { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

const DAYS_OPTIONS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

export const GrupHariManager = ({ periodeId, grupHariList = [], onRefresh, selectedGrupId, onSelectGrup }) => {
  const { request } = useApi();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [label, setLabel] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openAddModal = () => {
    setEditingId(null);
    setLabel('');
    setSelectedDays([]);
    setModalOpen(true);
  };

  const openEditModal = (grup) => {
    setEditingId(grup.id);
    setLabel(grup.label);
    setSelectedDays(grup.hariAktif || []);
    setModalOpen(true);
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error('Label grup hari wajib diisi.');
      return;
    }
    if (selectedDays.length === 0) {
      toast.error('Pilih minimal 1 hari aktif.');
      return;
    }

    setLoading(true);
    try {
      const url = editingId ? `/aslap/grup-hari/${editingId}` : '/aslap/grup-hari';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? { label: label.trim(), hariAktif: selectedDays }
        : { periodeId, label: label.trim(), hariAktif: selectedDays };

      const res = await request(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan grup hari.');
      } else {
        toast.success(editingId ? 'Grup hari berhasil diperbarui.' : 'Grup hari berhasil ditambahkan.');
        setModalOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan koneksi saat menyimpan grup hari.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (grup) => {
    setDeleteTarget(grup);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await request(`/aslap/grup-hari/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menghapus grup hari.');
      } else {
        toast.success('Grup hari berhasil dihapus.');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
      toast.error('Koneksi server gagal saat menghapus grup hari.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        marginBottom: '24px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text)'
            }}>
              Grup Hari Operasional
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: 'var(--text-muted)'
            }}>
              Kelola grup hari untuk memilah data penerima per kelompok hari operasional
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--bg)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              color: 'var(--text)',
              fontFamily: 'inherit',
              transition: 'all 0.12s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--btn-primary-bg)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            + Tambah Grup
          </button>
        </div>

        {/* Daftar Grup */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          borderTop: '1px solid var(--border)',
          paddingTop: '16px'
        }}>
          {grupHariList.length === 0 ? (
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--text-muted)',
              fontStyle: 'italic'
            }}>
              Belum ada grup hari. Klik "Tambah Grup" untuk membuat grup baru.
            </p>
          ) : (
            grupHariList.map((g) => {
              const isSelected = selectedGrupId === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => onSelectGrup && onSelectGrup(g.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1px solid var(--btn-primary-bg)' : '1px solid var(--border)',
                    backgroundColor: isSelected ? 'var(--btn-primary-bg)' : 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: isSelected ? 'white' : 'var(--text)',
                      lineHeight: 1.3
                    }}>
                      {g.label}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                      lineHeight: 1.2
                    }}>
                      {(g.hariAktif || []).join(', ')}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderLeft: `1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : 'var(--border)'}`,
                    paddingLeft: '8px'
                  }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEditModal(g); }}
                      style={{
                        padding: '4px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 0
                      }}
                      title="Edit Grup"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); confirmDelete(g); }}
                      style={{
                        padding: '4px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-danger, #e53e3e)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 0
                      }}
                      title="Hapus Grup"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Grup Hari"
        message={`Apakah Anda yakin ingin menghapus grup '${deleteTarget?.label}'? Semua data penerima manfaat dalam grup ini akan ikut terhapus.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal Form */}
      {modalOpen && (
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
              {editingId ? 'Edit Grup Hari' : 'Tambah Grup Hari Baru'}
            </h4>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: '6px'
                }}>
                  Nama / Label Grup <span style={{ color: 'var(--color-danger, #e53e3e)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Contoh: SENIN-JUMAT, SABTU"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: '8px'
                }}>
                  Hari Aktif <span style={{ color: 'var(--color-danger, #e53e3e)', fontWeight: 400 }}>(min 1 hari)</span>
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px'
                }}>
                  {DAYS_OPTIONS.map((day) => {
                    const isChecked = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: 'var(--radius-sm)',
                          border: isChecked ? '1px solid var(--btn-primary-bg)' : '1px solid var(--border)',
                          backgroundColor: isChecked ? 'var(--btn-primary-bg)' : 'var(--bg)',
                          color: isChecked ? 'white' : 'var(--text)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                          fontFamily: 'inherit'
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                borderTop: '1px solid var(--border)',
                paddingTop: '16px'
              }}>
                <Button
                  type="button"
                  variant="quiet"
                  onPress={() => setModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isPending={loading}
                >
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
