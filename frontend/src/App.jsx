import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Layout } from './components/layout/Layout';

// Landing Dashboards
import { AslapDashboard } from './pages/aslap/AslapDashboard';
import { MitraDashboard } from './pages/mitra/MitraDashboard';
import { GiziDashboard } from './pages/gizi/GiziDashboard';
import { AkuntanDashboard } from './pages/akuntan/AkuntanDashboard';
import { KepalaDashboard } from './pages/kepala/KepalaDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { LaporanBugPage } from './pages/admin/LaporanBugPage';
import { RolePermissionMatrixPage } from './pages/admin/RolePermissionMatrixPage';

// Sub-pages / CRUD Pages
import { PenerimaManfaatPage } from './pages/aslap/PenerimaManfaatPage';
import { SekolahPage } from './pages/aslap/SekolahPage';
import { AslapPoPage } from './pages/aslap/AslapPoPage';
import { LaporanPage as AslapLaporanPage } from './pages/aslap/LaporanPage';
import { HargaBahanPage } from './pages/mitra/HargaBahanPage';
import { MitraPoPage } from './pages/mitra/MitraPoPage';
import { KendaraanPage } from './pages/mitra/KendaraanPage';
import { LaporanPage as MitraLaporanPage } from './pages/mitra/LaporanPage';
import { MenuHarianPage } from './pages/gizi/MenuHarianPage';
import MasterTargetGiziPage from './pages/gizi/MasterTargetGiziPage';
import { LaporanGiziPage } from './pages/gizi/LaporanGiziPage';
import { ApprovalPage } from './pages/kepala/ApprovalPage';
import { SettingPage } from './pages/shared/SettingPage';
import { AuditLogPage } from './pages/shared/AuditLogPage';

// Akuntan — Halaman Terpisah
import { JurnalTransaksiPage } from './pages/akuntan/JurnalTransaksiPage';
import { AkuntanPoPage } from './pages/akuntan/AkuntanPoPage';
import { ValidasiStokPage } from './pages/akuntan/ValidasiStokPage';
import { RabHarianPage } from './pages/akuntan/RabHarianPage';
import { SaldoAwalBarangPage } from './pages/akuntan/SaldoAwalBarangPage';
import { MutasiStokPage } from './pages/akuntan/MutasiStokPage';
import { DokumenResmiPage } from './pages/akuntan/DokumenResmiPage';
import { NominatifUpahPage } from './pages/akuntan/NominatifUpahPage';

// Akuntan — Laporan
import { LaporanPage } from './pages/akuntan/laporan/LaporanPage';
import { PeriodeSetupPage } from './pages/akuntan/laporan/PeriodeSetupPage';


import { useAuth } from './context/AuthContext';
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ASLAP') return <Navigate to="/aslap" replace />;
  if (user.role === 'MITRA') return <Navigate to="/mitra" replace />;
  if (user.role === 'AHLI_GIZI') return <Navigate to="/gizi" replace />;
  if (user.role === 'AKUNTAN') return <Navigate to="/akuntan" replace />;
  if (user.role === 'KEPALA_SPPG') return <Navigate to="/kepala" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <div>Selamat datang, {user.nama} ({user.role}). Halaman modul Anda belum diimplementasikan.</div>;
}

function App() {
  return (
    <Router>
      <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleRedirect />} />

            {/* ===== ASLAP Routes ===== */}
            <Route
              path="aslap"
              element={
                <ProtectedRoute requiredPerm="aslap-master:READ">
                  <AslapDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="aslap/penerima-manfaat"
              element={
                <ProtectedRoute requiredPerm="aslap-input:READ">
                  <PenerimaManfaatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="aslap/sekolah"
              element={
                <ProtectedRoute requiredPerm="aslap-master:READ">
                  <SekolahPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="aslap/po"
              element={
                <ProtectedRoute requiredPerm="aslap-po-approval:APPROVE">
                  <AslapPoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="aslap/laporan"
              element={
                <ProtectedRoute requiredPerm="aslap-laporan:READ">
                  <AslapLaporanPage />
                </ProtectedRoute>
              }
            />
            {/* ===== MITRA Routes ===== */}
            <Route
              path="mitra"
              element={
                <ProtectedRoute requiredPerm="mitra-master:READ">
                  <MitraDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="mitra/harga-bahan"
              element={
                <ProtectedRoute requiredPerm="mitra-master:READ">
                  <HargaBahanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="mitra/po"
              element={
                <ProtectedRoute requiredPerm="mitra-po:READ">
                  <MitraPoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="mitra/kendaraan"
              element={
                <ProtectedRoute requiredPerm="mitra-master:READ">
                  <KendaraanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="mitra/laporan"
              element={
                <ProtectedRoute requiredPerm="mitra-po:READ">
                  <MitraLaporanPage />
                </ProtectedRoute>
              }
            />

            {/* ===== AHLI_GIZI Routes ===== */}
            <Route
              path="gizi"
              element={
                <ProtectedRoute requiredPerm="gizi-master:READ">
                  <GiziDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="gizi/menu-harian"
              element={
                <ProtectedRoute requiredPerm="gizi-menu:READ">
                  <MenuHarianPage />
                </ProtectedRoute>
              }
            />
            <Route path="gizi/target-gizi" element={<ProtectedRoute requiredPerm="gizi-target:READ"><MasterTargetGiziPage /></ProtectedRoute>} />
            <Route
              path="gizi/laporan-gizi"
              element={
                <ProtectedRoute requiredPerm="gizi-laporan:READ">
                  <LaporanGiziPage />
                </ProtectedRoute>
              }
            />

            {/* ===== AKUNTAN Routes ===== */}
            <Route
              path="akuntan"
              element={
                <ProtectedRoute requiredPerm="akuntan-master:READ">
                  <AkuntanDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/periode-setup"
              element={
                <ProtectedRoute requiredPerm="akuntan-master:READ">
                  <PeriodeSetupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/jurnal"
              element={
                <ProtectedRoute requiredPerm="akuntan-jurnal:READ">
                  <JurnalTransaksiPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/po"
              element={
                <ProtectedRoute requiredPerm="mitra-po:READ">
                  <AkuntanPoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/stock-barang"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/kebutuhan-belanja-bahan"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/validasi-stok"
              element={
                <ProtectedRoute requiredPerm="akuntan-stok:READ">
                  <ValidasiStokPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/rab-harian"
              element={
                <ProtectedRoute requiredPerm="akuntan-rab:READ">
                  <RabHarianPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/anggaran-harian"
              element={
                <ProtectedRoute requiredPerm="akuntan-rab:READ">
                  <RabHarianPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/saldo-awal-barang"
              element={
                <ProtectedRoute requiredPerm="akuntan-stok:READ">
                  <SaldoAwalBarangPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/mutasi-stok"
              element={
                <ProtectedRoute requiredPerm="akuntan-stok:READ">
                  <MutasiStokPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/dokumen-resmi"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <DokumenResmiPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/per-periode"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/per-bulan"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/harian"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/lra"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/lpd2m"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/bapsd"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/sptj"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/btt"
              element={
                <ProtectedRoute requiredPerm="laporan-resmi:READ">
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/nominatif-upah"
              element={
                <ProtectedRoute requiredPerm="akuntan-upah:READ">
                  <NominatifUpahPage />
                </ProtectedRoute>
              }
            />

            {/* ===== KEPALA Routes ===== */}
            <Route
              path="kepala"
              element={
                <ProtectedRoute requiredPerm="kepala-approval:READ">
                  <KepalaDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="kepala/approval"
              element={
                <ProtectedRoute requiredPerm="kepala-approval:APPROVE">
                  <ApprovalPage />
                </ProtectedRoute>
              }
            />

            {/* ===== ADMIN Routes ===== */}
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredPerm="admin-user:READ">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute requiredPerm="admin-user:READ">
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/permissions"
              element={
                <ProtectedRoute requiredPerm="admin-permission:READ">
                  <RolePermissionMatrixPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/laporan-bug"
              element={
                <ProtectedRoute requiredPerm="laporan-bug:READ">
                  <LaporanBugPage />
                </ProtectedRoute>
              }
            />

            {/* ===== SHARED Routes ===== */}
            <Route
              path="audit-log"
              element={
                <ProtectedRoute requiredPerm="audit-log:READ">
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="setting"
              element={
                <ProtectedRoute>
                  <SettingPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<div>Halaman tidak ditemukan</div>} />
          </Route>
        </Routes>
      </AuthProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
