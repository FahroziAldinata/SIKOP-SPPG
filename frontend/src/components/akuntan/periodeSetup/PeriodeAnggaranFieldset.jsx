import React from 'react';
import { RangeCalendar } from "@heroui/react";

const formatInputRupiah = (valueStr) => {
    if (valueStr === null || valueStr === undefined || valueStr === '') return '';
    const clean = valueStr.toString().replace(/\D/g, '');
    if (!clean) return '';
    return `Rp ${Number(clean).toLocaleString('id-ID')}`;
};

const parseInputRupiah = (valueStr) => {
    if (!valueStr) return '';
    return valueStr.toString().replace(/\D/g, '');
};

export const PeriodeAnggaranFieldset = ({
    selectedRange,
    tanggalMulai,
    tanggalSelesai,
    anggaranAlokasi,
    onRangeChange,
    setAnggaranAlokasi
}) => {
    return (
        <fieldset style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '20px',
            margin: 0,
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text)',
            width: '50%',
            minWidth: '340px',
            boxSizing: 'border-box'
        }}>
            <legend style={{
                fontWeight: '700',
                padding: '0 8px',
                color: 'var(--text)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                1. Rentang Periode &amp; Pagu Dana
            </legend>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'start' }}>
                <div style={{ flex: '0 0 auto', minWidth: '280px' }}>
                    <RangeCalendar
                        aria-label="Rentang Periode"
                        value={selectedRange}
                        onChange={onRangeChange}
                        style={{ width: '160%' }}
                    >
                        <RangeCalendar.Header>
                            <RangeCalendar.NavButton slot="previous" />
                            <RangeCalendar.Heading />
                            <RangeCalendar.NavButton slot="next" />
                        </RangeCalendar.Header>

                        <RangeCalendar.Grid>
                            <RangeCalendar.GridHeader>
                                {(day) => (
                                    <RangeCalendar.HeaderCell>
                                        {day}
                                    </RangeCalendar.HeaderCell>
                                )}
                            </RangeCalendar.GridHeader>

                            <RangeCalendar.GridBody>
                                {(date) => (
                                    <RangeCalendar.Cell date={date} />
                                )}
                            </RangeCalendar.GridBody>
                        </RangeCalendar.Grid>
                    </RangeCalendar>
                    <div className="text-sm font-medium mt-6 space-y-1" style={{ color: 'var(--text-muted)' }}>
                        <div>Tanggal Mulai: {tanggalMulai || "-"}</div>
                        <div>Tanggal Selesai: {tanggalSelesai || "-"}</div>
                    </div>
                </div>

                <div style={{ flex: '1', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Anggaran Alokasi (Pagu BGN) *
                        </label>
                        <input
                            type="text"
                            placeholder="Masukkan Pagu Dana"
                            value={formatInputRupiah(anggaranAlokasi)}
                            onChange={e => setAnggaranAlokasi(parseInputRupiah(e.target.value))}
                            className="form-field"
                            style={{ width: '90%' }}
                            required
                        />
                    </div>
                </div>
            </div>
        </fieldset>
    );
};
