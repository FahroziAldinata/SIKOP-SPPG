import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Eraser, Upload, Trash2 } from 'lucide-react';

export const SettingPage = () => {
    const { user, token, login } = useAuth();
    const { request } = useApi();
    const toast = useToast();

    const [nama, setNama] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);

    // --- TTD State ---
    const [ttdPath, setTtdPath] = useState(null);
    const [ttdLoading, setTtdLoading] = useState(false);
    const [ttdError, setTtdError] = useState(null);

    const canvasRef = useRef(null);
    const drawingRef = useRef(false);
    const hasDrawnRef = useRef(false);
    const ttdFileInputRef = useRef(null);
    const lastPosRef = useRef({ x: 0, y: 0 });

    const imgBase = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
        : '';

    // Prefill user details
    useEffect(() => {
        if (user) {
            setNama(user.nama || '');
            setUsername(user.username || '');
        }
    }, [user]);

    // Load TTD on mount
    useEffect(() => {
        const loadTtd = async () => {
            try {
                const res = await request('/auth/ttd', { method: 'GET' });
                if (res.ok) {
                    const data = await res.json();
                    setTtdPath(data.ttdPath || null);
                }
            } catch {
                // TTD opsional — gagal diam-diam
            }
        };
        loadTtd();
    }, []);

    // Init canvas — set ukuran dan DPR scaling
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = rect.width || 480;
        const h = rect.height || 160;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#333333';
    }, []);

    useEffect(() => {
        // Delay sedikit agar layout sudah render dan getBoundingClientRect akurat
        const timer = setTimeout(() => {
            initCanvas();
        }, 50);
        return () => clearTimeout(timer);
    }, [initCanvas]);

    const getCanvasPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        if (e.touches) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleCanvasMouseDown = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        drawingRef.current = true;
        const pos = getCanvasPos(e, canvas);
        lastPosRef.current = pos;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const handleCanvasMouseMove = (e) => {
        e.preventDefault();
        if (!drawingRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const pos = getCanvasPos(e, canvas);
        const ctx = canvas.getContext('2d');
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        lastPosRef.current = pos;
        hasDrawnRef.current = true;
    };

    const handleCanvasMouseUp = (e) => {
        e.preventDefault();
        drawingRef.current = false;
    };

    const handleCanvasMouseLeave = () => {
        drawingRef.current = false;
    };

    const handleClearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        hasDrawnRef.current = false;
        setTtdError(null);
    };

    const handleSaveCanvas = async () => {
        if (!hasDrawnRef.current) {
            setTtdError('Silakan buat tanda tangan di atas kanvas terlebih dahulu.');
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        setTtdError(null);
        setTtdLoading(true);
        try {
            canvas.toBlob(async (blob) => {
                try {
                    const file = new File([blob], 'ttd.png', { type: 'image/png' });
                    const formData = new FormData();
                    formData.append('ttd', file);
                    const res = await request('/auth/ttd', { method: 'POST', body: formData });
                    if (res.ok) {
                        const data = await res.json();
                        setTtdPath(data.ttdPath);
                        handleClearCanvas();
                        toast.success('Tanda tangan berhasil disimpan.');
                    } else {
                        const d = await res.json().catch(() => ({ error: 'Gagal menyimpan tanda tangan.' }));
                        setTtdError(d.error || 'Gagal menyimpan tanda tangan.');
                    }
                } catch {
                    setTtdError('Terjadi kesalahan saat mengunggah tanda tangan.');
                } finally {
                    setTtdLoading(false);
                }
            }, 'image/png');
        } catch {
            setTtdError('Gagal memproses kanvas.');
            setTtdLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setTtdError(null);

        const allowedTypes = ['image/png', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            setTtdError('Hanya file PNG atau JPG yang diizinkan.');
            e.target.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setTtdError('Ukuran file tidak boleh melebihi 5 MB.');
            e.target.value = '';
            return;
        }

        setTtdLoading(true);
        try {
            const formData = new FormData();
            formData.append('ttd', file);
            const res = await request('/auth/ttd', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                setTtdPath(data.ttdPath);
                toast.success('Tanda tangan berhasil diunggah.');
            } else {
                const d = await res.json().catch(() => ({ error: 'Gagal mengunggah gambar.' }));
                setTtdError(d.error || 'Gagal mengunggah gambar.');
            }
        } catch {
            setTtdError('Terjadi kesalahan koneksi.');
        } finally {
            setTtdLoading(false);
            e.target.value = '';
        }
    };

    const handleDeleteTtd = async () => {
        setTtdError(null);
        setTtdLoading(true);
        try {
            const res = await request('/auth/ttd', { method: 'DELETE' });
            if (res.ok) {
                setTtdPath(null);
                toast.success('Tanda tangan berhasil dihapus.');
            } else {
                const d = await res.json().catch(() => ({ error: 'Gagal menghapus tanda tangan.' }));
                setTtdError(d.error || 'Gagal menghapus tanda tangan.');
            }
        } catch {
            setTtdError('Terjadi kesalahan koneksi.');
        } finally {
            setTtdLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (password && password.length < 6) {
            toast.error('Password minimal harus 6 karakter.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Konfirmasi password tidak cocok.');
            return;
        }

        setLoading(true);
        try {
            const body = { nama, username };
            if (password) {
                body.password = password;
            }

            const r = await request('/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (r.ok) {
                const resJson = await r.json();
                toast.success('Profil berhasil diperbarui.');
                setPassword('');
                setConfirmPassword('');
                // Update user details in context
                login(token, resJson.user);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memperbarui profil.' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error('Terjadi kesalahan koneksi.');
        } finally {
            setLoading(false);
        }
    };

    const labelStyle = {
        textTransform: 'uppercase',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.07em',
        color: 'var(--text-muted)',
        display: 'block',
        marginBottom: '6px',
    };

    const cardStyle = {
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    };

    const btnPrimaryStyle = {
        padding: '10px 20px',
        backgroundColor: 'var(--btn-primary-bg)',
        color: 'var(--btn-primary-text)',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    };

    const btnSecondaryStyle = {
        padding: '8px 14px',
        backgroundColor: 'transparent',
        color: 'var(--text-muted)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '13px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    };

    const btnDangerStyle = {
        padding: '8px 14px',
        backgroundColor: 'transparent',
        color: '#dc2626',
        border: '1px solid #dc2626',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '13px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Pengaturan Profil &amp; Akun</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '0', marginBottom: '20px' }}>
                Perbarui nama tampilan, username, atau kata sandi Anda di sini.
            </p>
            <form onSubmit={handleUpdateProfile} style={cardStyle}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={labelStyle}>
                            Nama Lengkap:
                        </label>
                        <input
                            type="text"
                            value={nama}
                            onChange={e => setNama(e.target.value)}
                            className="form-field"
                            required
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={labelStyle}>
                            Username:
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="form-field"
                            required
                        />
                    </div>
                </div>
                <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '5px 0' }} />
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={labelStyle}>
                            Kata Sandi Baru (opsional):
                        </label>
                        <input
                            type="password"
                            placeholder="Kosongkan jika tidak ingin mengubah"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="form-field"
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={labelStyle}>
                            Konfirmasi Kata Sandi Baru:
                        </label>
                        <input
                            type="password"
                            placeholder="Ulangi kata sandi baru"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="form-field"
                        />
                    </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--btn-primary-bg)',
                            color: 'var(--btn-primary-text)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        {loading ? 'Menyimpan...' : 'Perbarui Profil'}
                    </button>
                </div>
            </form>

            {/* ===== SECTION TTD BASAH ===== */}
            <div style={{ marginTop: '28px' }}>
                <h3 style={{ color: 'var(--text)', marginBottom: '8px', fontSize: '16px', fontWeight: 700 }}>
                    Tanda Tangan (TTD Basah)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '0', marginBottom: '16px' }}>
                    Tanda tangan dipakai di dokumen PDF. Tanpa TTD, area PDF tetap kosong.
                </p>

                <div style={cardStyle}>
                    {/* Sub-section: Preview TTD saat ini */}
                    <div>
                        <label style={labelStyle}>Tanda Tangan Saat Ini</label>
                        {ttdPath ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <img
                                    src={imgBase + ttdPath}
                                    alt="TTD saat ini"
                                    style={{
                                        maxHeight: '120px',
                                        maxWidth: '320px',
                                        objectFit: 'contain',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        backgroundColor: '#ffffff',
                                        padding: '8px',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleDeleteTtd}
                                    disabled={ttdLoading}
                                    style={{ ...btnDangerStyle, opacity: ttdLoading ? 0.6 : 1, cursor: ttdLoading ? 'not-allowed' : 'pointer' }}
                                >
                                    <Trash2 size={14} />
                                    Hapus TTD
                                </button>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', margin: '0' }}>
                                Belum ada tanda tangan.
                            </p>
                        )}
                    </div>

                    <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

                    {/* Sub-section: Gambar tanda tangan di kanvas */}
                    <div>
                        <label style={labelStyle}>Buat Tanda Tangan (Kanvas)</label>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '0', marginBottom: '10px' }}>
                            Gambar tanda tangan Anda di bawah ini menggunakan mouse atau sentuhan.
                        </p>
                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            onMouseLeave={handleCanvasMouseLeave}
                            onTouchStart={handleCanvasMouseDown}
                            onTouchMove={handleCanvasMouseMove}
                            onTouchEnd={handleCanvasMouseUp}
                            style={{
                                width: 'min(480px, 100%)',
                                height: '160px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: '#ffffff',
                                cursor: 'crosshair',
                                display: 'block',
                                touchAction: 'none',
                            }}
                        />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={handleClearCanvas}
                                disabled={ttdLoading}
                                style={{ ...btnSecondaryStyle, opacity: ttdLoading ? 0.6 : 1, cursor: ttdLoading ? 'not-allowed' : 'pointer' }}
                            >
                                <Eraser size={14} />
                                Bersihkan
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCanvas}
                                disabled={ttdLoading}
                                style={{ ...btnPrimaryStyle, opacity: ttdLoading ? 0.6 : 1, cursor: ttdLoading ? 'not-allowed' : 'pointer' }}
                            >
                                {ttdLoading ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
                            </button>
                        </div>
                    </div>

                    <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

                    {/* Sub-section: Upload gambar */}
                    <div>
                        <label style={labelStyle}>Unggah Gambar TTD (PNG / JPG, maks. 5 MB)</label>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '0', marginBottom: '10px' }}>
                            Unggah file gambar tanda tangan yang sudah ada.
                        </p>
                        <input
                            ref={ttdFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => ttdFileInputRef.current && ttdFileInputRef.current.click()}
                            disabled={ttdLoading}
                            style={{ ...btnSecondaryStyle, opacity: ttdLoading ? 0.6 : 1, cursor: ttdLoading ? 'not-allowed' : 'pointer' }}
                        >
                            <Upload size={14} />
                            {ttdLoading ? 'Mengunggah...' : 'Pilih &amp; Unggah Gambar'}
                        </button>
                    </div>

                    {/* Pesan error */}
                    {ttdError && (
                        <p style={{ color: '#dc2626', fontSize: '12px', margin: '0', fontWeight: 500 }}>
                            {ttdError}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
