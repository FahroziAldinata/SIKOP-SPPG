import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { parseDate } from "@internationalized/date";
import { Skeleton } from '../../../components/ui/Skeleton';

import { PeriodeListCard } from '../../../components/akuntan/periodeSetup/PeriodeListCard';
import { PeriodeAnggaranFieldset } from '../../../components/akuntan/periodeSetup/PeriodeAnggaranFieldset';
import { LembagaFieldset } from '../../../components/akuntan/periodeSetup/LembagaFieldset';
import { PelaporanFieldset } from '../../../components/akuntan/periodeSetup/PelaporanFieldset';
import { ClosePeriodeModal } from '../../../components/akuntan/periodeSetup/ClosePeriodeModal';

export const PeriodeSetupPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Period list & closing modal state
    const [periodeList, setPeriodeList] = useState([]);
    const [closingPeriode, setClosingPeriode] = useState(null);
    const [closingLoading, setClosingLoading] = useState(false);
    const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);

    // Form fields state
    const [tanggalMulai, setTanggalMulai] = useState('');
    const [tanggalSelesai, setTanggalSelesai] = useState('');
    const [selectedRange, setSelectedRange] = useState(null);
    const [anggaranAlokasi, setAnggaranAlokasi] = useState('');
    const [namaLembaga, setNamaLembaga] = useState('');
    const [alamat, setAlamat] = useState('');
    const [namaKepalaSPPG, setNamaKepalaSPPG] = useState('');
    const [namaAkuntanSPPG, setNamaAkuntanSPPG] = useState('');
    const [namaYayasan, setNamaYayasan] = useState('');
    const [ketuaYayasan, setKetuaYayasan] = useState('');
    const [nomorRekeningVA, setNomorRekeningVA] = useState('');
    const [tahunAnggaran, setTahunAnggaran] = useState('');
    const [awalPeriodeBerikutnya, setAwalPeriodeBerikutnya] = useState('');
    const [tanggalPelaporan, setTanggalPelaporan] = useState('');
    const [tempatPelaporan, setTempatPelaporan] = useState('');

    const calendarDateToString = (date) => date ? `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}` : "";

    const handleRangeChange = (range) => {
        if (!range?.start || !range?.end) return;
        setSelectedRange(range);
        setTanggalMulai(calendarDateToString(range.start));
        setTanggalSelesai(calendarDateToString(range.end));
    };

    // Fetch latest period on mount for autofilling defaults
    const fetchLatestSetup = async () => {
        setLoading(true);
        try {
            const r = await request('/akuntan/periode/latest-setup');
            if (r.ok) {
                const resJson = await r.json();
                const latest = resJson.data;
                if (latest) {
                    const prevEnd = new Date(latest.tanggalSelesai);
                    const sugStart = new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth(), prevEnd.getUTCDate() + 1));
                    const sugStartStr = sugStart.toISOString().split('T')[0];
                    setTanggalMulai(sugStartStr);

                    const sugEnd = new Date(Date.UTC(sugStart.getUTCFullYear(), sugStart.getUTCMonth(), sugStart.getUTCDate() + 9));
                    const sugEndStr = sugEnd.toISOString().split('T')[0];
                    setTanggalSelesai(sugEndStr);

                    const sugNextStart = new Date(Date.UTC(sugEnd.getUTCFullYear(), sugEnd.getUTCMonth(), sugEnd.getUTCDate() + 1));
                    setAwalPeriodeBerikutnya(sugNextStart.toISOString().split('T')[0]);
                    setTanggalPelaporan(sugEndStr);
                    setTahunAnggaran(sugStart.getUTCFullYear().toString());

                    if (sugStartStr && sugEndStr) {
                        setSelectedRange({ start: parseDate(sugStartStr), end: parseDate(sugEndStr) });
                    }

                    if (latest.setupLembaga) {
                        const setup = latest.setupLembaga;
                        setNamaLembaga(setup.namaLembaga || '');
                        setAlamat(setup.alamat || '');
                        setNamaKepalaSPPG(setup.namaKepalaSPPG || '');
                        setNamaAkuntanSPPG(setup.namaAkuntanSPPG || '');
                        setNamaYayasan(setup.namaYayasan || '');
                        setKetuaYayasan(setup.ketuaYayasan || '');
                        setNomorRekeningVA(setup.nomorRekeningVA || '');
                        setTempatPelaporan(setup.tempatPelaporan || '');
                    }
                } else {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setTanggalMulai(todayStr);
                    setTanggalSelesai(todayStr);
                    setAwalPeriodeBerikutnya(todayStr);
                    setTanggalPelaporan(todayStr);
                    setTahunAnggaran(new Date().getFullYear().toString());
                }
            } else {
                toast.error('Gagal memuat data periode terakhir untuk autofill.');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi saat memuat data awal.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPeriodeList = async () => {
        try {
            const r = await request('/aslap/periode');
            if (r.ok) {
                const data = await r.json();
                setPeriodeList(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Gagal memuat daftar periode:', err);
        }
    };

    const handleClosePeriode = async (periodeId, overwrite = false) => {
        setClosingLoading(true);
        try {
            const r = await request(`/akuntan/periode/${periodeId}/tutup-periode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overwrite })
            });
            const resJson = await r.json();
            if (r.ok) {
                toast.success(resJson.message || 'Periode berhasil ditutup dan saldo awal berhasil dicarry-over!');
                setClosingPeriode(null);
                setShowOverwritePrompt(false);
                await fetchLatestSetup();
                await fetchPeriodeList();
            } else if (r.status === 409 && resJson.requiresConfirmation) {
                setShowOverwritePrompt(true);
            } else {
                toast.error(resJson.error || 'Gagal menutup periode');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi saat menutup periode.');
        } finally {
            setClosingLoading(false);
        }
    };

    useEffect(() => {
        fetchLatestSetup();
        fetchPeriodeList();
    }, []);

    // Recalculate helper when tanggalSelesai changes
    useEffect(() => {
        if (tanggalSelesai) {
            const currentEnd = new Date(tanggalSelesai);
            if (!isNaN(currentEnd.getTime())) {
                const nextStart = new Date(Date.UTC(currentEnd.getUTCFullYear(), currentEnd.getUTCMonth(), currentEnd.getUTCDate() + 1));
                setAwalPeriodeBerikutnya(nextStart.toISOString().split('T')[0]);
                setTanggalPelaporan(tanggalSelesai);
            }
        }
    }, [tanggalSelesai]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!tanggalMulai || !tanggalSelesai || !anggaranAlokasi ||
            !namaLembaga || !alamat || !namaKepalaSPPG || !namaAkuntanSPPG ||
            !namaYayasan || !ketuaYayasan || !nomorRekeningVA || !tahunAnggaran ||
            !awalPeriodeBerikutnya || !tanggalPelaporan || !tempatPelaporan) {
            toast.error('Seluruh field wajib harus diisi.');
            return;
        }
        setSubmitting(true);
        try {
            const body = {
                tanggalMulai, tanggalSelesai, anggaranAlokasi: parseFloat(anggaranAlokasi),
                namaLembaga, alamat, namaKepalaSPPG, namaAkuntanSPPG, namaYayasan, ketuaYayasan,
                nomorRekeningVA, tahunAnggaran: parseInt(tahunAnggaran, 10),
                awalPeriodeBerikutnya, tanggalPelaporan, tempatPelaporan
            };

            const r = await request('/akuntan/periode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (r.ok) {
                toast.success('Periode dan Setup Lembaga baru berhasil dibuat!');
                await fetchLatestSetup();
                await fetchPeriodeList();
                setAnggaranAlokasi('');
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat periode baru' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Buka Periode &amp; Setup Lembaga Baru</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '-10px', marginBottom: '20px' }}>
                Halaman ini digunakan untuk memulai periode operasional dan keuangan baru. Data lembaga di-autofill otomatis dari periode sebelumnya untuk menghemat waktu Anda.
            </p>

            <PeriodeListCard
                periodeList={periodeList}
                user={user}
                onRequestClose={(periode) => { setClosingPeriode(periode); setShowOverwritePrompt(false); }}
            />

            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Skeleton height="150px" borderRadius="var(--radius-md)" />
                    <Skeleton height="180px" borderRadius="var(--radius-md)" />
                    <Skeleton height="120px" borderRadius="var(--radius-md)" />
                    <Skeleton height="40px" width="180px" borderRadius="var(--radius-md)" />
                </div>
            )}

            {!loading && (
                <form onSubmit={handleSubmit} style={{
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px',
                    backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '20px'
                }}>
                    <PeriodeAnggaranFieldset
                        selectedRange={selectedRange} tanggalMulai={tanggalMulai} tanggalSelesai={tanggalSelesai}
                        anggaranAlokasi={anggaranAlokasi} onRangeChange={handleRangeChange} setAnggaranAlokasi={setAnggaranAlokasi}
                    />
                    <LembagaFieldset
                        namaLembaga={namaLembaga} setNamaLembaga={setNamaLembaga} nomorRekeningVA={nomorRekeningVA} setNomorRekeningVA={setNomorRekeningVA}
                        alamat={alamat} setAlamat={setAlamat} namaKepalaSPPG={namaKepalaSPPG} setNamaKepalaSPPG={setNamaKepalaSPPG}
                        namaAkuntanSPPG={namaAkuntanSPPG} setNamaAkuntanSPPG={setNamaAkuntanSPPG} namaYayasan={namaYayasan} setNamaYayasan={setNamaYayasan}
                        ketuaYayasan={ketuaYayasan} setKetuaYayasan={setKetuaYayasan}
                    />
                    <PelaporanFieldset
                        tahunAnggaran={tahunAnggaran} setTahunAnggaran={setTahunAnggaran} tempatPelaporan={tempatPelaporan} setTempatPelaporan={setTempatPelaporan}
                        tanggalPelaporan={tanggalPelaporan} setTanggalPelaporan={setTanggalPelaporan} awalPeriodeBerikutnya={awalPeriodeBerikutnya} setAwalPeriodeBerikutnya={setAwalPeriodeBerikutnya}
                    />
                    <button
                        type="submit" disabled={submitting}
                        style={{
                            padding: "12px 24px", fontWeight: 600,
                            backgroundColor: submitting ? 'var(--border)' : 'var(--btn-primary-bg)',
                            color: submitting ? 'var(--text-muted)' : 'var(--btn-primary-text)',
                            borderWidth: "medium", borderStyle: "none", borderColor: "currentColor", borderImage: "none",
                            borderRadius: "var(--radius-sm)", cursor: submitting ? 'not-allowed' : 'pointer', marginTop: "10px", fontSize: "14px", alignSelf: "flex-start"
                        }}
                    >
                        {submitting ? 'Menyimpan...' : 'Buka & Setup Periode Baru'}
                    </button>
                </form>
            )}

            <ClosePeriodeModal
                closingPeriode={closingPeriode} showOverwritePrompt={showOverwritePrompt} closingLoading={closingLoading}
                onClose={() => { setClosingPeriode(null); setShowOverwritePrompt(false); }} onConfirm={handleClosePeriode}
            />
        </div>
    );
};
