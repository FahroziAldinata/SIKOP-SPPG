import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';

export default function MasterTargetGiziPage() {
  const { request } = useApi();
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const r = await request('/gizi/master-target');
    if (r.ok) setData(await r.json());
    else toast.error('Gagal memuat data target gizi');
    setLoading(false);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      energiKkal: item.energiKkal,
      proteinGr: item.proteinGr,
      lemakGr: item.lemakGr,
      karbohidratGr: item.karbohidratGr,
      seratGr: item.seratGr,
    });
  };

  const save = async (id) => {
    const r = await request('/gizi/master-target/' + id, {
      method: 'PUT',
      body: JSON.stringify(editForm),
    });
    if (r.ok) {
      toast.success('Target gizi berhasil disimpan');
      setEditingId(null);
      load();
    } else {
      const d = await r.json().catch(() => ({ error: 'Gagal menyimpan' }));
      toast.error(d.error);
    }
  };

  const cancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const fieldMeta = [
    { key: 'energiKkal', label: 'Energi (kkal)' },
    { key: 'proteinGr', label: 'Protein (g)' },
    { key: 'lemakGr', label: 'Lemak (g)' },
    { key: 'karbohidratGr', label: 'Karbo (g)' },
    { key: 'seratGr', label: 'Serat (g)' },
  ];

  const tableColumns = [
    {
      key: 'kelompok',
      header: 'Target Gizi',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.kelompokUmurMenu?.nama || '-'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.kelompokUmurMenu?.jalur} - {row.kelompokUmurMenu?.kode}</div>
        </div>
      )
    },
    ...fieldMeta.map(f => ({
      key: f.key,
      header: f.label,
      render: (value, row) => {
        const isEditing = editingId === row.id;
        const val = isEditing ? editForm[f.key] : value;
        if (isEditing) {
          return (
            <input
              type="number"
              className="form-field"
              style={{ width: 70 }}
              value={val || ''}
              onChange={e => setEditForm(prev => ({ ...prev, [f.key]: parseInt(e.target.value) || 0 }))}
            />
          );
        }
        return <span style={{ fontFamily: 'monospace' }}>{val}</span>;
      }
    })),
    {
      key: 'aksi',
      header: 'Aksi',
      width: 110,
      render: (_, row) => {
        const isEditing = editingId === row.id;
        if (isEditing) {
          return (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => save(row.id)} style={{ padding: '4px 12px', fontSize: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Simpan</button>
              <button onClick={cancel} style={{ padding: '4px 12px', fontSize: 12, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>Batal</button>
            </div>
          );
        }
        return (
          <button onClick={() => startEdit(row)} style={{ padding: '4px 12px', fontSize: 12, background: 'var(--bg-muted)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
        );
      }
    }
  ];

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 24, backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Target Gizi</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
          Standar target gizi per kelompok umur berdasarkan AKG BGN.
          Perubahan di sini akan dipakai untuk blok menu baru (blok lama tidak berubah).
        </p>
        <Table columns={tableColumns} data={data} scrollHeight={400} emptyText="Belum ada data target gizi." />
      </div>
    </div>
  );
}
