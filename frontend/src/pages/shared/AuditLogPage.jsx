import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/ui/Table';
import { Skeleton } from '../../components/ui/Skeleton';

const AKSI_STYLE = {
  CREATE:  { color: 'var(--color-success)', bg: 'rgba(16,185,129,0.12)' },
  UPDATE:  { color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.13)' },
  DELETE:  { color: 'var(--color-danger)',  bg: 'rgba(239,68,68,0.12)' },
  APPROVE: { color: 'var(--color-success)', bg: 'rgba(16,185,129,0.12)' },
  REJECT:  { color: 'var(--color-danger)',  bg: 'rgba(239,68,68,0.12)' },
  KOREKSI: { color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.13)' },
};

const AKSI_OPTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'KOREKSI'];

const ringkas = (val) => {
  if (!val) return '—';
  try {
    const s = JSON.stringify(val);
    return s.length > 80 ? s.slice(0, 80) + '…' : s;
  } catch {
    return String(val);
  }
};

export const AuditLogPage = () => {
  const { request } = useApi();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filter state
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [userId, setUserId] = useState('');
  const [aksi, setAksi] = useState('');
  const [resource, setResource] = useState('');
  const [applied, setApplied] = useState({});

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (applied.tanggalMulai) params.set('tanggalMulai', applied.tanggalMulai);
      if (applied.tanggalSelesai) params.set('tanggalSelesai', applied.tanggalSelesai);
      if (applied.userId) params.set('userId', applied.userId);
      if (applied.aksi) params.set('aksi', applied.aksi);
      if (applied.resource) params.set('resource', applied.resource);
      params.set('page', applied.page || 1);
      params.set('limit', 20);

      const res = await request('/audit-log?' + params.toString());
      if (res.ok) {
        const body = await res.json();
        setRows(body.data);
        setPagination(body.pagination);
      } else {
        toast.error('Gagal memuat audit log');
      }
    } catch (err) {
      toast.error('Gagal memuat audit log');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const applyFilter = (e) => {
    e.preventDefault();
    setApplied({
      tanggalMulai,
      tanggalSelesai,
      userId: userId.trim(),
      aksi,
      resource: resource.trim(),
      page: 1,
    });
  };

  const resetFilter = () => {
    setTanggalMulai('');
    setTanggalSelesai('');
    setUserId('');
    setAksi('');
    setResource('');
    setApplied({});
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setApplied((a) => ({ ...a, page }));
  };

  const columns = [
    {
      key: 'createdAt',
      label: 'Waktu',
      render: (row) => {
        const d = new Date(row.createdAt);
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
              {d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'user',
      label: 'User',
      render: (row) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{row.user?.nama || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {row.user?.username} • {row.user?.role}
          </div>
        </div>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (row) => {
        const s = AKSI_STYLE[row.aksi] || AKSI_STYLE.CREATE;
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: 11,
              fontWeight: 700,
              color: s.color,
              backgroundColor: s.bg,
            }}
          >
            {row.aksi}
          </span>
        );
      },
    },
    { key: 'entityType', label: 'Resource' },
    { key: 'entityId', label: 'Entity ID' },
    {
      key: 'dataBaru',
      label: 'Perubahan',
      render: (row) => {
        const txt = row.dataBaru ? ringkas(row.dataBaru) : row.dataLama ? ringkas(row.dataLama) : '—';
        return (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{txt}</span>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px var(--gap-outer)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>Audit Log</h2>

      {/* ── FILTER ─────────────────────────────────────────────────────── */}
      <form
        onSubmit={applyFilter}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'flex-end',
          padding: '16px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        {[
          { label: 'Dari tanggal', value: tanggalMulai, set: setTanggalMulai, type: 'date' },
          { label: 'Sampai tanggal', value: tanggalSelesai, set: setTanggalSelesai, type: 'date' },
          { label: 'User ID', value: userId, set: setUserId, type: 'text' },
          { label: 'Resource', value: resource, set: setResource, type: 'text' },
        ].map((f) => (
          <label key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 11, color: 'var(--text-muted)' }}>
            {f.label}
            <input
              type={f.type}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              style={{
                padding: '7px 10px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                backgroundColor: 'var(--bg-input, #fff)',
                color: 'var(--text)',
              }}
            />
          </label>
        ))}

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 11, color: 'var(--text-muted)' }}>
          Aksi
          <select
            value={aksi}
            onChange={(e) => setAksi(e.target.value)}
            style={{
              padding: '7px 10px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              backgroundColor: 'var(--bg-input, #fff)',
              color: 'var(--text)',
            }}
          >
            <option value="">Semua</option>
            {AKSI_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cari
          </button>
          <button
            type="button"
            onClick={resetFilter}
            style={{
              padding: '8px 18px',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </form>

      {/* ── TABLE ──────────────────────────────────────────────────────── */}
      <section>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          Riwayat Aksi ({pagination.total})
        </h3>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Skeleton height="40px" />
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
        ) : (
          <Table columns={columns} data={rows} emptyText="Tidak ada data audit log." />
        )}
      </section>

      {/* ── PAGINATION ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => goToPage(pagination.page - 1)}
          disabled={pagination.page <= 1 || loading}
          style={{
            padding: '7px 16px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
            opacity: pagination.page <= 1 ? 0.5 : 1,
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text)',
          }}
        >
          ← Prev
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Hal {pagination.page} / {pagination.totalPages}
        </span>
        <button
          onClick={() => goToPage(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages || loading}
          style={{
            padding: '7px 16px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
            opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text)',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};
