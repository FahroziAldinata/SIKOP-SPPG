import React from 'react';
import { Calendar } from 'lucide-react';
import { RangeCalendar } from "@heroui/react";

export const PeriodeFilter = ({
  showCalendar,
  setShowCalendar,
  selectedRange,
  setSelectedRange,
  setTanggalMulai,
  setTanggalSelesai,
  calendarDateToString,
  calendarRef,
  tanggalMulai,
  tanggalSelesai
}) => {
  return (
    <div ref={calendarRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
        PERIODE TANGGAL
      </label>
      <button
        type="button"
        onClick={() => setShowCalendar(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          color: (!tanggalMulai && !tanggalSelesai) ? 'var(--text-muted)' : 'var(--text)',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          minWidth: '220px',
          justifyContent: 'flex-start'
        }}
      >
        <Calendar size={16} color="var(--text-muted)" />
        <span>
          {!tanggalMulai && !tanggalSelesai
            ? 'Pilih Tanggal...'
            : tanggalMulai === tanggalSelesai
            ? tanggalMulai
            : `${tanggalMulai} s.d. ${tanggalSelesai}`}
        </span>
      </button>

      {showCalendar && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-hover)',
            padding: '12px'
          }}
        >
          <RangeCalendar
            aria-label="Rentang Periode"
            value={selectedRange}
            onChange={(range) => {
              if (!range?.start || !range?.end) return;
              setSelectedRange(range);
              setTanggalMulai(calendarDateToString(range.start));
              setTanggalSelesai(calendarDateToString(range.end));
              setShowCalendar(false);
            }}
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
        </div>
      )}
    </div>
  );
};

export default PeriodeFilter;
