import React from 'react';

export const Lpd2mBuktiSection = ({
    selectedPeriodeIds, periods, targetBuktiPeriodeId, setTargetBuktiPeriodeId,
    namaBuktiInput, setNamaBuktiInput, jenisBuktiInput, setJenisBuktiInput,
    setFileBuktiInput, uploadingBukti, buktiLpd2mList, buktiLoading,
    handleUploadBukti, handleDeleteBukti
}) => {
    return (
        <div style={{
            marginTop: '20px',
            marginBottom: '20px',
            padding: '16px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card, #ffffff)'
        }}>
            <div style={{ marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                    📎 Bukti LPD2M (Opsional — bisa kosong)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Upload bukti pembayaran/transfer per periode. Saat generate PDF, berkas ini akan di-embed ke PDF lalu otomatis dihapus.
                </span>
            </div>

            {/* Form Upload Bukti */}
            <form onSubmit={handleUploadBukti} style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'flex-end',
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: 'var(--bg, #f8fafc)',
                borderRadius: '6px',
                border: '1px dashed var(--border)'
            }}>
                {selectedPeriodeIds.length > 1 && (
                    <div style={{ flex: '1 1 180px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Target Periode
                        </label>
                        <select
                            value={targetBuktiPeriodeId}
                            onChange={(e) => setTargetBuktiPeriodeId(e.target.value)}
                            className="form-field"
                            style={{ width: '100%', fontSize: '13px' }}
                        >
                            {selectedPeriodeIds.map(id => {
                                const p = periods.find(item => item.id === id);
                                return (
                                    <option key={id} value={id}>
                                        {p ? `${p.tanggalMulai} - ${p.tanggalSelesai}` : id}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Nama Bukti
                    </label>
                    <input
                        type="text"
                        placeholder="Contoh: Kuitansi Pembelian / SP2D"
                        value={namaBuktiInput}
                        onChange={(e) => setNamaBuktiInput(e.target.value)}
                        className="form-field"
                        style={{ width: '100%', fontSize: '13px' }}
                    />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Jenis Bukti
                    </label>
                    <select
                        value={jenisBuktiInput}
                        onChange={(e) => setJenisBuktiInput(e.target.value)}
                        className="form-field"
                        style={{ width: '100%', fontSize: '13px' }}
                    >
                        <option value="BUKTI_TRANSFER">Bukti Transfer</option>
                        <option value="KUITANSI">Kuitansi</option>
                        <option value="SP2D">SP2D</option>
                        <option value="LAINNYA">Lainnya</option>
                    </select>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Pilih File (Image / PDF)
                    </label>
                    <input
                        id="input-file-bukti-lpd2m"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setFileBuktiInput(e.target.files[0] || null)}
                        className="form-field"
                        style={{ width: '100%', fontSize: '12px' }}
                    />
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={uploadingBukti}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--btn-primary-bg, #2563eb)',
                            color: 'var(--btn-primary-text, #ffffff)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm, 4px)',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: uploadingBukti ? 'not-allowed' : 'pointer',
                            opacity: uploadingBukti ? 0.7 : 1
                        }}
                    >
                        {uploadingBukti ? 'Uploading…' : '📤 Upload Bukti'}
                    </button>
                </div>
            </form>

            {/* List Bukti */}
            <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>
                    Daftar Bukti Terupload ({buktiLpd2mList.length})
                </h4>
                {buktiLoading ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Memuat bukti…</p>
                ) : buktiLpd2mList.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                        Belum ada bukti yang diupload untuk periode ini (opsional — PDF tetap dapat digenerate tanpa lampiran).
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {buktiLpd2mList.map((b) => (
                            <div
                                key={b.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--bg, #f1f5f9)',
                                    borderRadius: '4px',
                                    fontSize: '13px'
                                }}
                            >
                                {/* KIRI: nama, badge jenis, tanggal */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, marginRight: '8px' }}>{b.namaBukti}</span>
                                    <span style={{
                                        fontSize: '11px',
                                        padding: '2px 6px',
                                        backgroundColor: 'var(--border, #cbd5e1)',
                                        borderRadius: '4px',
                                        marginRight: '8px'
                                    }}>
                                        {b.jenis}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {new Date(b.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {/* KANAN: thumbnail / placeholder + tombol hapus */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                    {b.mimeType && b.mimeType.startsWith('image/') ? (
                                        <span style={{ position: 'relative', display: 'inline-block' }}>
                                            <img
                                                src={'/' + b.filePath}
                                                alt={b.namaBukti}
                                                style={{
                                                    maxHeight: '80px',
                                                    maxWidth: '120px',
                                                    objectFit: 'contain',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--border, #cbd5e1)',
                                                    background: '#fff',
                                                    display: 'block'
                                                }}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const fb = e.currentTarget.nextElementSibling;
                                                    if (fb) fb.style.display = 'flex';
                                                }}
                                            />
                                            {/* Fallback jika gambar gagal load */}
                                            <div style={{
                                                display: 'none',
                                                maxHeight: '80px',
                                                width: '80px',
                                                height: '60px',
                                                backgroundColor: 'var(--bg, #e2e8f0)',
                                                border: '1px solid var(--border, #cbd5e1)',
                                                borderRadius: '4px',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexDirection: 'column',
                                                fontSize: '11px',
                                                color: 'var(--text-muted)',
                                                textAlign: 'center',
                                                padding: '4px'
                                            }}>
                                                🖼️<br />[Gagal Load]
                                            </div>
                                        </span>
                                    ) : (
                                        <div style={{
                                            width: '80px',
                                            height: '60px',
                                            backgroundColor: 'var(--bg, #e2e8f0)',
                                            border: '1px solid var(--border, #cbd5e1)',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexDirection: 'column',
                                            fontSize: '11px',
                                            color: 'var(--text-muted)',
                                            textAlign: 'center',
                                            padding: '4px'
                                        }}>
                                            📄<br />[Non-Gambar]
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteBukti(b.id)}
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: '#ef4444',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🗑️ Hapus
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
