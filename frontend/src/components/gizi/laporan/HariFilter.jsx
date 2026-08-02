import React from 'react';
import { CalendarDays } from 'lucide-react';

export const HariFilter = ({
  showHariPopup,
  setShowHariPopup,
  monthView,
  setMonthView,
  selectedDates,
  setSelectedDates,
  hariRef
}) => {
  return (
    <div ref={hariRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
        PILIH HARI
      </label>
      <button
        type="button"
        onClick={() => setShowHariPopup(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          color: selectedDates.length === 0 ? 'var(--text-muted)' : 'var(--text)',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          minWidth: '220px',
          justifyContent: 'flex-start'
        }}
      >
        <CalendarDays size={16} color="var(--text-muted)" />
        <span>
          {selectedDates.length === 0
            ? 'Pilih Hari...'
            : selectedDates.length === 1
            ? selectedDates[0]
            : `${selectedDates.length} hari terpilih`}
        </span>
      </button>

      {showHariPopup && (() => {
        const daysInMonth = new Date(monthView.y, monthView.m + 1, 0).getDate();
        const firstDayIndex = (new Date(monthView.y, monthView.m, 1).getDay() + 6) % 7;
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        return (
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
              padding: '16px',
              minWidth: '290px'
            }}
          >
            {/* Header Navigasi Bulan */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setMonthView(prev => prev.m === 0 ? { y: prev.y - 1, m: 11 } : { y: prev.y, m: prev.m - 1 })}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', padding: '2px 8px' }}
              >
                ‹
              </button>
              <span style={{ fontWeight: '700', fontSize: '14px', textTransform: 'capitalize' }}>
                {new Date(monthView.y, monthView.m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setMonthView(prev => prev.m === 11 ? { y: prev.y + 1, m: 0 } : { y: prev.y, m: prev.m + 1 })}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', padding: '2px 8px' }}
              >
                ›
              </button>
            </div>

            {/* Grid Hari Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                <div key={day} style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Hari Cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: '4px' }}>
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} style={{ width: '36px', height: '36px' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${monthView.y}-${String(monthView.m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = selectedDates.includes(dateStr);
                const isToday = dateStr === todayStr;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDates(prev =>
                        prev.includes(dateStr)
                          ? prev.filter(d => d !== dateStr)
                          : [...prev, dateStr].sort()
                      );
                    }}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: isToday && !isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                      backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                      color: isSelected ? '#fff' : 'var(--text)',
                      fontWeight: isSelected || isToday ? '700' : '400',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Chips */}
            {selectedDates.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', maxWidth: '276px' }}>
                {selectedDates.map(d => {
                  const parts = d.split('-');
                  const formatted = `${parts[2]}/${parts[1]}`;
                  return (
                    <span
                      key={d}
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        color: '#fff',
                        borderRadius: '999px',
                        padding: '2px 10px',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {formatted}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDates(prev => prev.filter(x => x !== d));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          lineHeight: 1,
                          padding: 0,
                          marginLeft: '2px'
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedDates([])}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: 'var(--radius-sm)' }}
              >
                Bersihkan
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default HariFilter;
