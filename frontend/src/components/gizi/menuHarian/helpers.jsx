import React from 'react';

export const formatDate = (val) => val ? new Date(val).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-';

export const getTanggalMusnah = (dateStr) => {
    if (!dateStr) return '-';
    const dateParts = dateStr.split('T')[0].split('-');
    if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            const d = new Date(year, month, day + 3);
            return formatDate(d);
        }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    d.setDate(d.getDate() + 3);
    return formatDate(d);
};

export const getBahanName = (bahan, bahanPokokList = []) => bahan.bahanPokok?.nama || bahanPokokList.find(bp => bp.id === bahan.bahanPokokId)?.nama || bahan.bahanPokokId;

export const getBahanLabel = (bp) => `${bp.nama} (${bp.satuan})`;

export const fieldLabel = (text) => (
    <label style={{
        textTransform: 'uppercase',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.07em',
        color: 'var(--text-muted)',
        display: 'block',
        marginBottom: 6
    }}>
        {text}
    </label>
);

export const buttonStyle = (variant = 'primary', disabled = false) => ({
    padding: '10px 14px',
    border: variant === 'primary' ? 'none' : '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: disabled ? 'var(--bg-muted)' : (variant === 'primary' ? 'var(--btn-primary-bg)' : 'var(--bg)'),
    color: disabled ? 'var(--text-muted)' : (variant === 'primary' ? 'var(--btn-primary-text)' : 'var(--text)'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700,
    fontSize: 14,
    whiteSpace: 'nowrap'
});
