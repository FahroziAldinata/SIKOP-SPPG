import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import Dropdown from '../../components/ui/Dropdown';

const ROLES = ['AKUNTAN', 'ASLAP', 'AHLI_GIZI', 'KEPALA_SPPG', 'MITRA'];

const ROLE_LABELS = {
  AKUNTAN: 'Akuntan',
  ASLAP: 'Aslap',
  AHLI_GIZI: 'Ahli Gizi',
  KEPALA_SPPG: 'Kepala SPPG',
  MITRA: 'Mitra',
};

const AKSI_LIST = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT'];
const AKSI_CHIP = { CREATE: 'C', READ: 'R', UPDATE: 'U', DELETE: 'D', APPROVE: 'A', EXPORT: 'E' };

const MODUL_ORDER = ['aslap', 'gizi', 'mitra', 'akuntan', 'kepala', 'laporan', 'admin'];
const MODUL_LABELS = {
  aslap: 'ASLAP',
  gizi: 'GIZI',
  mitra: 'MITRA',
  akuntan: 'AKUNTAN',
  kepala: 'KEPALA SPPG',
  laporan: 'LAPORAN',
  admin: 'ADMIN',
};

const MODUL_OPTIONS = [
  { value: 'aslap', label: 'ASLAP' },
  { value: 'gizi', label: 'GIZI' },
  { value: 'mitra', label: 'MITRA' },
  { value: 'akuntan', label: 'AKUNTAN' },
  { value: 'kepala', label: 'KEPALA SPPG' },
  { value: 'laporan', label: 'LAPORAN' },
  { value: 'admin', label: 'ADMIN' },
  { value: 'chat', label: 'CHAT' },
];

const EMPTY_RESOURCE_FORM = { nama: '', kode: '', modul: '' };

export const RolePermissionMatrixPage = () => {
  const { request } = useApi();
  const toast = useToast();

  const [resources, setResources] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Confirm delete dialog state (revoke permission)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // { permId, role, aksi, resourceNama }

  // Grouped resources by modul
  const [groupedResources, setGroupedResources] = useState({});

  // ── KELOLA RESOURCE STATE ─────────────────────────────────────────────────
  const [resourceForm, setResourceForm] = useState(EMPTY_RESOURCE_FORM);
  const [resourceSubmitting, setResourceSubmitting] = useState(false);

  // Confirm nonaktifkan / aktifkan resource
  const [resourceConfirmOpen, setResourceConfirmOpen] = useState(false);
  const [pendingResourceToggle, setPendingResourceToggle] = useState(null); // { id, kode, aktif }

  // ── FETCH DATA ────────────────────────────────────────────────────────────
  const fetchResources = async () => {
    try {
      const resResources = await request('/admin/resources');
      if (!resResources.ok) return;
      const resourceData = await resResources.json();
      setResources(resourceData);

      // Group resources by modul
      const grouped = {};
      resourceData.forEach((res) => {
        const modul = res.modul || 'lainnya';
        if (!grouped[modul]) grouped[modul] = [];
        grouped[modul].push(res);
      });
      setGroupedResources(grouped);
    } catch {
      // silent — errors from fetchData will surface
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [resResources, resPermissions] = await Promise.all([
        request('/admin/resources'),
        request('/admin/permissions'),
      ]);

      if (!resResources.ok || !resPermissions.ok) {
        toast.error('Gagal memuat data permission');
        setLoadError(true);
        return;
      }

      const resourceData = await resResources.json();
      const permissionData = await resPermissions.json();

      setResources(resourceData);
      setPermissions(permissionData);

      // Group resources by modul
      const grouped = {};
      resourceData.forEach((res) => {
        const modul = res.modul || 'lainnya';
        if (!grouped[modul]) grouped[modul] = [];
        grouped[modul].push(res);
      });
      setGroupedResources(grouped);
    } catch {
      toast.error('Gagal memuat data permission');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const findPerm = (role, resourceKode, aksi) =>
    permissions.find(
      (p) =>
        p.role === role &&
        p.resource?.kode === resourceKode &&
        p.aksi === aksi
    );

  // ── GRANT PERMISSION ──────────────────────────────────────────────────────
  const handleGrant = async (role, resource, aksi) => {
    try {
      const res = await request('/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, resourceId: resource.id, aksi }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setPermissions((prev) => [...prev, newItem]);
        toast.success(`Izin ${aksi} untuk ${role} pada "${resource.nama}" diberikan`);
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || `Gagal memberikan izin ${aksi}`);
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  // ── REVOKE PERMISSION ─────────────────────────────────────────────────────
  const openRevokeConfirm = (perm, resource) => {
    setPendingDelete({
      permId: perm.id,
      role: perm.role,
      aksi: perm.aksi,
      resourceNama: resource.nama,
    });
    setConfirmOpen(true);
  };

  const handleRevoke = async () => {
    setConfirmOpen(false);
    if (!pendingDelete) return;
    const { permId, role, aksi, resourceNama } = pendingDelete;
    try {
      const res = await request(`/admin/permissions/${permId}`, { method: 'DELETE' });
      if (res.ok) {
        setPermissions((prev) => prev.filter((p) => p.id !== permId));
        toast.success(`Izin ${aksi} untuk ${role} pada "${resourceNama}" dihapus`);
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Gagal menghapus izin');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setPendingDelete(null);
    }
  };

  const handleChipClick = (role, resource, aksi) => {
    const existingPerm = findPerm(role, resource.kode, aksi);
    if (existingPerm) {
      openRevokeConfirm(existingPerm, resource);
    } else {
      handleGrant(role, resource, aksi);
    }
  };

  // ── TAMBAH RESOURCE ───────────────────────────────────────────────────────
  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (!resourceForm.nama || !resourceForm.kode || !resourceForm.modul) {
      toast.error('Nama, kode, dan modul wajib diisi');
      return;
    }
    setResourceSubmitting(true);
    try {
      const res = await request('/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceForm),
      });
      if (res.ok) {
        toast.success(`Resource "${resourceForm.kode}" berhasil ditambahkan`);
        setResourceForm(EMPTY_RESOURCE_FORM);
        await fetchResources();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Gagal menambahkan resource');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setResourceSubmitting(false);
    }
  };

  // ── TOGGLE RESOURCE AKTIF / NONAKTIF ─────────────────────────────────────
  const openResourceToggleConfirm = (resource) => {
    setPendingResourceToggle({ id: resource.id, kode: resource.kode, aktif: resource.aktif });
    setResourceConfirmOpen(true);
  };

  const handleResourceToggle = async () => {
    setResourceConfirmOpen(false);
    if (!pendingResourceToggle) return;
    const { id, kode, aktif } = pendingResourceToggle;
    try {
      let res;
      if (aktif) {
        // Nonaktifkan → DELETE (soft-delete / aktif:false)
        res = await request(`/admin/resources/${id}`, { method: 'DELETE' });
      } else {
        // Aktifkan kembali → PUT aktif:true
        res = await request(`/admin/resources/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aktif: true }),
        });
      }
      if (res.ok) {
        toast.success(aktif ? `Resource "${kode}" dinonaktifkan` : `Resource "${kode}" diaktifkan kembali`);
        await fetchResources();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Gagal mengubah status resource');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setPendingResourceToggle(null);
    }
  };

  // ── ORDERED MODUL KEYS ────────────────────────────────────────────────────
  const orderedModuls = [
    ...MODUL_ORDER.filter((m) => groupedResources[m]),
    ...Object.keys(groupedResources).filter(
      (m) => !MODUL_ORDER.includes(m) && groupedResources[m]
    ),
  ];

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '6px',
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', color: 'var(--text)' }}>Kelola Akses &amp; Permission</h2>

      {/* ── SECTION: KELOLA RESOURCE ─────────────────────────────────────── */}
      <section
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow)',
          marginBottom: '32px',
        }}
      >
        <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          Kelola Resource
        </h3>

        {/* Form tambah resource */}
        <form onSubmit={handleCreateResource}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Nama Resource</label>
              <input
                style={inputStyle}
                placeholder="Contoh: Master Data Aslap"
                value={resourceForm.nama}
                onChange={(e) => setResourceForm((f) => ({ ...f, nama: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Kode (kebab-case lowercase)</label>
              <input
                style={inputStyle}
                placeholder="Contoh: aslap-master"
                value={resourceForm.kode}
                onChange={(e) => setResourceForm((f) => ({ ...f, kode: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Modul</label>
              <Dropdown
                options={MODUL_OPTIONS}
                value={resourceForm.modul}
                onChange={(val) => setResourceForm((f) => ({ ...f, modul: val }))}
                placeholder="Pilih modul..."
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={resourceSubmitting}
            style={{
              padding: '9px 24px',
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: resourceSubmitting ? 'not-allowed' : 'pointer',
              opacity: resourceSubmitting ? 0.7 : 1,
            }}
          >
            {resourceSubmitting ? 'Menyimpan...' : 'Tambah Resource'}
          </button>
        </form>

        {/* Tabel daftar resource */}
        {!loading && !loadError && resources.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Daftar Resource ({resources.length})
            </h4>
            {/* Wrapper scroll: max 5 baris (~200px), header sticky */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      {['Kode', 'Nama', 'Modul', 'Status', 'Aksi'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'left',
                            backgroundColor: 'var(--table-header-bg)',
                            color: 'var(--table-header-text)',
                            fontWeight: 700,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid var(--border)',
                            whiteSpace: 'nowrap',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((res, idx) => (
                      <tr
                        key={res.id}
                        style={{
                          backgroundColor: idx % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg)',
                          transition: 'background var(--transition-fast)',
                        }}
                      >
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {res.kode}
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text)' }}>
                          {res.nama}
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          {MODUL_LABELS[res.modul] || res.modul}
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 10px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: res.aktif ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)',
                              color: '#fff',
                            }}
                          >
                            {res.aktif ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => openResourceToggleConfirm(res)}
                            style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: res.aktif ? 'var(--color-danger, #dc2626)' : 'var(--color-success, #16a34a)',
                              color: 'white',
                              cursor: 'pointer',
                            }}
                          >
                            {res.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION: MATRIX PERMISSION ───────────────────────────────────── */}
      <section
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow)',
          marginBottom: '32px',
        }}
      >
        {/* ── LEGEND ──────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '20px',
            padding: '10px 14px',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: '1.6',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--text)', marginRight: '4px' }}>Legend:</span>
          {AKSI_LIST.map((aksi) => (
            <span key={aksi} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: '1px solid transparent',
                }}
              >
                {AKSI_CHIP[aksi]}
              </span>
              <span>= {aksi}</span>
            </span>
          ))}
          <span
            style={{
              marginLeft: '8px',
              paddingLeft: '8px',
              borderLeft: '1px solid var(--border)',
              fontStyle: 'italic',
            }}
          >
            ADMIN hanya punya akses pada resource administratif (admin-user, admin-permission, audit-log, laporan-bug, chatbot) via grant eksplisit — tidak ditampilkan di matriks ini.
          </span>
        </div>

        {/* ── LOADING STATE ────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height="40px" borderRadius="var(--radius-sm)" />
            ))}
          </div>
        )}

        {/* ── ERROR / EMPTY STATE ──────────────────────────────────────────── */}
        {!loading && loadError && (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}
          >
            Gagal memuat data permission. Silakan muat ulang halaman.
          </div>
        )}

        {/* ── MATRIX CONTENT ──────────────────────────────────────────────── */}
        {!loading && !loadError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {orderedModuls.length === 0 ? (
              <div
                style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                }}
              >
                Belum ada resource terdaftar.
              </div>
            ) : (
              orderedModuls.map((modul) => {
                const modulResources = groupedResources[modul] || [];
                return (
                  <div key={modul}>
                    {/* Modul header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '10px',
                        paddingBottom: '8px',
                        borderBottom: '2px solid var(--color-primary)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {MODUL_LABELS[modul] || modul.toUpperCase()}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          fontWeight: 500,
                        }}
                      >
                        ({modulResources.length} resource)
                      </span>
                    </div>

                    {/* Resource table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '12px',
                        }}
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                padding: '8px 12px',
                                textAlign: 'left',
                                backgroundColor: 'var(--table-header-bg)',
                                color: 'var(--table-header-text)',
                                fontWeight: 700,
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                borderBottom: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm) 0 0 0',
                                minWidth: '180px',
                              }}
                            >
                              Resource
                            </th>
                            {ROLES.map((role) => (
                              <th
                                key={role}
                                style={{
                                  padding: '8px 10px',
                                  textAlign: 'center',
                                  backgroundColor: 'var(--table-header-bg)',
                                  color: 'var(--table-header-text)',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  borderBottom: '1px solid var(--border)',
                                  borderLeft: '1px solid var(--border)',
                                  whiteSpace: 'nowrap',
                                  minWidth: '120px',
                                }}
                              >
                                {ROLE_LABELS[role] || role}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {modulResources.map((resource, idx) => (
                            <tr
                              key={resource.id}
                              style={{
                                backgroundColor:
                                  idx % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg)',
                                transition: 'background var(--transition-fast)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  idx % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg)';
                              }}
                            >
                              <td
                                style={{
                                  padding: '8px 12px',
                                  borderBottom: '1px solid var(--border)',
                                  fontWeight: 600,
                                  color: 'var(--text)',
                                  verticalAlign: 'middle',
                                }}
                              >
                                <div style={{ fontWeight: 600, color: resource.aktif ? 'var(--text)' : 'var(--text-muted)' }}>
                                  {resource.nama}
                                  {!resource.aktif && (
                                    <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--color-danger, #dc2626)', fontWeight: 700 }}>
                                      [nonaktif]
                                    </span>
                                  )}
                                </div>
                                <div
                                  style={{
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    marginTop: '2px',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {resource.kode}
                                </div>
                              </td>
                              {ROLES.map((role) => (
                                <td
                                  key={role}
                                  style={{
                                    padding: '6px 8px',
                                    borderBottom: '1px solid var(--border)',
                                    borderLeft: '1px solid var(--border)',
                                    textAlign: 'center',
                                    verticalAlign: 'middle',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      justifyContent: 'center',
                                      gap: '2px',
                                    }}
                                  >
                                    {AKSI_LIST.map((aksi) => {
                                      const perm = findPerm(role, resource.kode, aksi);
                                      const has = Boolean(perm);
                                      return (
                                        <button
                                          key={aksi}
                                          title={
                                            has
                                              ? `${role}: ${aksi} — ${resource.kode} (klik untuk hapus izin)`
                                              : `Klik untuk memberi izin ${aksi} ke ${role} pada ${resource.kode}`
                                          }
                                          onClick={() => handleChipClick(role, resource, aksi)}
                                          style={{
                                            minWidth: '22px',
                                            height: '22px',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '2px',
                                            border: has
                                              ? '1px solid transparent'
                                              : '1px solid var(--border)',
                                            backgroundColor: has
                                              ? 'var(--color-primary)'
                                              : 'transparent',
                                            color: has ? '#fff' : 'var(--text-muted)',
                                            transition: 'all var(--transition-fast)',
                                            lineHeight: 1,
                                            padding: 0,
                                            fontFamily: 'inherit',
                                          }}
                                          onMouseEnter={(e) => {
                                            if (has) {
                                              e.currentTarget.style.backgroundColor =
                                                'var(--color-danger)';
                                              e.currentTarget.style.borderColor = 'transparent';
                                              e.currentTarget.style.color = '#fff';
                                            } else {
                                              e.currentTarget.style.backgroundColor =
                                                'var(--color-primary-light)';
                                              e.currentTarget.style.borderColor =
                                                'var(--color-primary)';
                                              e.currentTarget.style.color =
                                                'var(--color-primary)';
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = has
                                              ? 'var(--color-primary)'
                                              : 'transparent';
                                            e.currentTarget.style.borderColor = has
                                              ? 'transparent'
                                              : 'var(--border)';
                                            e.currentTarget.style.color = has
                                              ? '#fff'
                                              : 'var(--text-muted)';
                                          }}
                                        >
                                          {AKSI_CHIP[aksi]}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* ── CONFIRM REVOKE PERMISSION DIALOG ─────────────────────────────── */}
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus Izin"
        message={
          pendingDelete
            ? `Hapus izin ${pendingDelete.aksi} untuk role ${pendingDelete.role} pada resource "${pendingDelete.resourceNama}"?`
            : ''
        }
        onConfirm={handleRevoke}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDelete(null);
        }}
      />

      {/* ── CONFIRM TOGGLE RESOURCE DIALOG ───────────────────────────────── */}
      <ConfirmDialog
        open={resourceConfirmOpen}
        title={pendingResourceToggle?.aktif ? 'Nonaktifkan Resource' : 'Aktifkan Resource'}
        message={
          pendingResourceToggle?.aktif
            ? `Resource "${pendingResourceToggle?.kode}" akan dinonaktifkan. Semua grant aktif harus dicabut terlebih dahulu. Lanjutkan?`
            : `Resource "${pendingResourceToggle?.kode}" akan diaktifkan kembali. Lanjutkan?`
        }
        onConfirm={handleResourceToggle}
        onCancel={() => {
          setResourceConfirmOpen(false);
          setPendingResourceToggle(null);
        }}
      />
    </div>
  );
};
