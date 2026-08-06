import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { WorkflowStepper } from '../../components/ui/WorkflowStepper';
import { DashboardSummaryCards } from '../../components/ui/DashboardSummaryCards';
import Dropdown from '../../components/ui/Dropdown';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';


export const MitraDashboard = () => {
  const { request } = useApi();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [stats, setStats] = useState({ totalBahan: 0, inputHarga: 0, poCount: 0, poValue: 0 });
  const [loading, setLoading] = useState(true);
  const [dashSummary, setDashSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [notifikasi, setNotifikasi] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const notifIntervalRef = useRef(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [resP, resB] = await Promise.all([
          request('/aslap/periode'),
          request('/mitra/bahan-pokok')
        ]);

        const dataP = await resP.json();
        const dataB = await resB.json();

        setPeriods(dataP);

        let activeP = null;
        if (dataP.length > 0) {
          activeP = dataP[0];
          setSelectedPeriod(activeP);
        }

        let hargaCount = 0;
        let pCount = 0;
        let pVal = 0;

        if (activeP) {
          // Fetch harga bahan count
          const resH = await request(`/mitra/harga-bahan?periodeId=${activeP.id}`);
          if (resH.ok) {
            const dataH = await resH.json();
            hargaCount = dataH.length;
          }

          // Fetch PO summary
          const resPo = await request(`/mitra/po/list?periodeId=${activeP.id}`);
          if (resPo.ok) {
            const dataPo = await resPo.json();
            pCount = dataPo.data?.length || 0;
            pVal = (dataPo.data || []).reduce((sum, po) => {
              const val = po.items.reduce((s, item) => s + Number(item.subtotal), 0);
              return sum + val;
            }, 0);
          }
        }

        setStats({
          totalBahan: dataB.length,
          inputHarga: hargaCount,
          poCount: pCount,
          poValue: pVal
        });

        if (activeP) {
          try {
            const resSummary = await request(`/dashboard/summary?periodeId=${activeP.id}`);
            if (resSummary.ok) {
              setDashSummary((await resSummary.json()).data);
            }
          } finally {
            setLoadingSummary(false);
          }
        } else {
          setLoadingSummary(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const fetchNotifikasi = async () => {
    try {
      const res = await request('/notifikasi');
      if (res.ok) {
        const data = await res.json();
        setNotifikasi(data);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoadingNotif(false);
    }
  };

  useEffect(() => {
    fetchNotifikasi();
    notifIntervalRef.current = setInterval(fetchNotifikasi, 30000);
    return () => clearInterval(notifIntervalRef.current);
  }, []);

  const handleMarkRead = async () => {
    try {
      await request('/notifikasi/mark-read', { method: 'PATCH' });
      setNotifikasi(prev => prev.map(n => ({ ...n, dibaca: true })));
    } catch (err) {
      // ignore
    }
  };

  const handlePeriodChange = async (pid) => {
    const period = periods.find(p => p.id === pid);
    setSelectedPeriod(period);

    try {
      // Refresh statistics for selected period
      const [resH, resPo] = await Promise.all([
        request(`/mitra/harga-bahan?periodeId=${pid}`),
        request(`/mitra/po/list?periodeId=${pid}`)
      ]);

      const dataH = resH.ok ? await resH.json() : [];
      const dataPo = resPo.ok ? await resPo.json() : { data: [] };
      const pCount = dataPo.data?.length || 0;
      const pVal = (dataPo.data || []).reduce((sum, po) => {
        const val = po.items.reduce((s, item) => s + Number(item.subtotal), 0);
        return sum + val;
      }, 0);

      setStats(prev => ({
        ...prev,
        inputHarga: dataH.length,
        poCount: pCount,
        poValue: pVal
      }));
    } catch (e) {
      console.error(e);
    }

    setLoadingSummary(true);
    try {
      const resSummary = await request(`/dashboard/summary?periodeId=${pid}`);
      if (resSummary.ok) {
        setDashSummary((await resSummary.json()).data);
      }
    } finally {
      setLoadingSummary(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Banner Skeleton */}
        <Skeleton height="120px" borderRadius="var(--radius-md)" />
        
        {/* Period Selector & Detail Card Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '20px' }}>
          <Skeleton height="90px" borderRadius="var(--radius-md)" />
          <Skeleton height="90px" borderRadius="var(--radius-md)" />
        </div>

        {/* 3 Summary Cards Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <Skeleton height="110px" borderRadius="var(--radius-md)" />
          <Skeleton height="110px" borderRadius="var(--radius-md)" />
          <Skeleton height="110px" borderRadius="var(--radius-md)" />
        </div>

        {/* Bottom panels (Quick Actions & Workflow Progress) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          <Skeleton height="130px" borderRadius="var(--radius-md)" />
          <Skeleton height="130px" borderRadius="var(--radius-md)" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{ backgroundColor: 'var(--color-role-mitra)', color: 'white', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Halo, Mitra Penyedia Bahan (Supplier)!</h2>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '14px' }}>
          Selamat datang kembali. Anda dapat memantau status alokasi harga bahan pokok periode berjalan serta menyusun dokumen Nota Pesanan (PO) secara digital.
        </p>
      </div>

      {/* Period Selector */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        marginBottom: '30px',
        width: '26%',
        minWidth: '320px'
      }}>
        <label style={{
          textTransform: 'uppercase',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.07em',
          color: 'var(--text-muted)',
          display: 'block',
          marginBottom: '6px'
        }}>
          Pilih Periode Aktif
        </label>
        <Dropdown
          style={{ width: '100%' }}
          value={selectedPeriod?.id || ''}
          onChange={handlePeriodChange}
          options={periods.map(p => ({
            value: p.id,
            label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
          }))}
        />
      </div>

      {selectedPeriod?.setupLembaga && (
        <Card style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow)',
          marginBottom: '25px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: 'var(--text)' }}>Detail Lembaga Periode Aktif</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
            <div>Nama SPPG: <strong>{selectedPeriod.setupLembaga.namaLembaga}</strong></div>
            <div>ID SPPG: <strong>{selectedPeriod.setupLembaga.nomorRekeningVA}</strong></div>
            <div>Ketua Yayasan Mitra: <strong>{selectedPeriod.setupLembaga.ketuaYayasan}</strong></div>
            <div>Nomor Rekening VA: <strong>{selectedPeriod.setupLembaga.nomorRekeningVA}</strong></div>
          </div>
        </Card>
      )}

      {/* Ringkasan Status Sistem */}
      <DashboardSummaryCards dashSummary={dashSummary} loadingSummary={loadingSummary} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #6f42c1', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Bahan Pokok Master</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.totalBahan}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total jenis bahan makanan</div>
        </Card>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #007bff', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Harga Terdaftar</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.inputHarga} / {stats.totalBahan}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bahan yang sudah diinput harganya</div>
        </Card>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #28a745', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Nota Pesanan (PO)</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.poCount} PO</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total nilai: <strong>Rp{stats.poValue.toLocaleString('id-ID')}</strong></div>
        </Card>
      </div>

      {/* Quick Actions Panel */}
      {/* ponytail: unify shade pastel to bg-elevated */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: 'var(--bg-elevated)', width: '50%' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Pintasan Aksi Cepat</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/mitra/harga-bahan')} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Kelola Harga Bahan</button>
          <button onClick={() => navigate('/mitra/po')} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Input &amp; Cetak PO (Nota Pesanan)</button>
          <button onClick={() => navigate('/mitra/kendaraan')} style={{ padding: '10px 20px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Kelola Kendaraan</button>
          <button onClick={() => navigate('/setting')} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Pengaturan Akun</button>
        </div>
      </div>

      {/* Workflow Progress */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: 'var(--bg-elevated)', marginTop: '25px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Progress Tahapan Operasional</h3>
        <WorkflowStepper workflowProgress={dashSummary?.workflowProgress} loading={loadingSummary} />
      </div>

      {/* Notifikasi Panel */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: 'var(--bg-elevated)', marginTop: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>
            🔔 Notifikasi
            {notifikasi.filter(n => !n.dibaca).length > 0 && (
              <span style={{
                marginLeft: '8px', fontSize: '11px', fontWeight: 700,
                backgroundColor: 'var(--color-danger, #ef4444)', color: '#fff',
                borderRadius: '999px', padding: '2px 8px'
              }}>
                {notifikasi.filter(n => !n.dibaca).length} baru
              </span>
            )}
          </h3>
          {notifikasi.some(n => !n.dibaca) && (
            <button
              onClick={handleMarkRead}
              style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Tandai semua dibaca
            </button>
          )}
        </div>
        {loadingNotif ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(3)].map((_, i) => <Skeleton key={i} height="44px" borderRadius="var(--radius-sm)" />)}
          </div>
        ) : notifikasi.length === 0 ? (
          <p style={{ color: 'var(--color-success, #16a34a)', fontSize: 14, margin: 0 }}>✓ Tidak ada notifikasi saat ini</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '240px', overflowY: 'auto' }}>
            {notifikasi.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${n.dibaca ? 'var(--border)' : 'rgba(59,130,246,0.35)'}`,
                  backgroundColor: n.dibaca ? 'transparent' : 'rgba(59,130,246,0.06)',
                  display: 'flex', flexDirection: 'column', gap: 3
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!n.dibaca && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 13, fontWeight: n.dibaca ? 400 : 600, color: 'var(--text)' }}>{n.judul}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: n.dibaca ? 0 : 16 }}>{n.pesan}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: n.dibaca ? 0 : 16 }}>
                  {new Date(n.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
