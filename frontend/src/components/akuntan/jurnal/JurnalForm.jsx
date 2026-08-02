import React from 'react';
import { DatePicker } from '../../DatePicker';
import Dropdown from '../../Dropdown';
import { NumberInput } from '../../NumberInput';
import QuickFillBanper from './QuickFillBanper';
import QuickFillPo from './QuickFillPo';

export const JurnalForm = ({
    jurnalForm,
    setJurnalForm,
    editId,
    akunList = [],
    selectedPrefillPoId,
    setSelectedPrefillPoId,
    realizedPoList = [],
    activePeriod,
    handlePrefillFromPo,
    openBulkModal,
    handleCancelEdit,
    saveJurnal,
    periodeId
}) => {
    return (
        <form onSubmit={saveJurnal} style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            marginBottom: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--text)' }}>
                    {editId ? 'Edit Jurnal Transaksi' : 'Buat Jurnal Transaksi'}
                </h3>
                {editId && (
                    <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(234,179,8,0.15)', color: '#ca8a04', fontWeight: 600 }}>
                        Mode Edit Active
                    </span>
                )}
            </div>

            <QuickFillBanper
                jurnalForm={jurnalForm}
                setJurnalForm={setJurnalForm}
                activePeriod={activePeriod}
                akunList={akunList}
            />

            <QuickFillPo
                selectedPrefillPoId={selectedPrefillPoId}
                setSelectedPrefillPoId={setSelectedPrefillPoId}
                realizedPoList={realizedPoList}
                handlePrefillFromPo={handlePrefillFromPo}
                openBulkModal={openBulkModal}
                periodeId={periodeId}
            />

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Tanggal
                    </label>
                    <DatePicker
                        value={jurnalForm.tanggal}
                        onChange={val => setJurnalForm(prev => ({ ...prev, tanggal: val }))}
                        defaultFocusMonth={activePeriod?.tanggalMulai}
                        required
                    />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Uraian
                    </label>
                    <input
                        type="text"
                        className="form-field"
                        placeholder="Contoh: Pembelian Beras 50kg"
                        value={jurnalForm.uraian}
                        onChange={e => setJurnalForm(prev => ({ ...prev, uraian: e.target.value }))}
                        required
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Jenis Transaksi
                    </label>
                    <Dropdown
                        style={{ width: '100%' }}
                        value={jurnalForm.jenis}
                        onChange={val => setJurnalForm(prev => ({ ...prev, jenis: val }))}
                        options={[
                            { value: '', label: '-- Pilih Jenis --' },
                            { value: 'MASUK', label: 'MASUK (Penerimaan Kas)' },
                            { value: 'KELUAR', label: 'KELUAR (Pengeluaran Kas)' },
                        ]}
                    />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Nominal
                    </label>
                    <NumberInput
                        className="form-field"
                        placeholder="Nominal (Rp)"
                        value={jurnalForm.nominal}
                        onChange={val => setJurnalForm(prev => ({ ...prev, nominal: val }))}
                        required
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Akun Kas
                    </label>
                    <Dropdown
                        style={{ width: '100%' }}
                        value={jurnalForm.akunKasId}
                        onChange={val => setJurnalForm(prev => ({ ...prev, akunKasId: val }))}
                        options={[
                            { value: '', label: '-- Pilih Akun Kas --' },
                            ...akunList.filter(a => a.tipe === 'KAS').map(a => ({
                                value: a.id,
                                label: `[${a.kode}] ${a.nama} (${a.tipe})`
                            }))
                        ]}
                    />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Akun Dana / Biaya
                    </label>
                    <Dropdown
                        style={{ width: '100%' }}
                        value={jurnalForm.akunDanaBiayaId}
                        onChange={val => setJurnalForm(prev => ({ ...prev, akunDanaBiayaId: val }))}
                        options={[
                            { value: '', label: '-- Pilih Akun Dana / Biaya --' },
                            ...akunList.filter(a => a.tipe !== 'KAS').map(a => ({
                                value: a.id,
                                label: `[${a.kode}] ${a.nama} (${a.tipe})`
                            }))
                        ]}
                    />
                </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <button type="submit" style={{
                    padding: '10px 20px',
                    backgroundColor: editId ? '#eab308' : 'var(--btn-primary-bg)',
                    color: editId ? '#000' : 'var(--btn-primary-text)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px'
                }}>
                    {editId ? 'Update Jurnal' : 'Simpan Jurnal'}
                </button>
                {editId && (
                    <button type="button" onClick={handleCancelEdit} style={{
                        padding: '10px 20px',
                        backgroundColor: 'transparent',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}>
                        Batal
                    </button>
                )}
            </div>
        </form>
    );
};

export default JurnalForm;
