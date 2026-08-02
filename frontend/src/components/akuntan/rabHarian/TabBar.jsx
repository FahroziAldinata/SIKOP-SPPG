import React from 'react';

export const TabBar = ({ tab, setTab }) => {
    const tabStyle = (t) => ({
        padding: '10px 24px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
        backgroundColor: tab === t ? 'var(--btn-primary-bg)' : 'var(--bg-elevated)',
        color: tab === t ? 'var(--btn-primary-text)' : 'var(--text-muted)',
        borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
        transition: 'all 0.15s ease'
    });

    return (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            <button style={tabStyle('rab')} onClick={() => setTab('rab')}>
                📋 RAB Harian
            </button>
            <button style={tabStyle('anggaran')} onClick={() => setTab('anggaran')}>
                💰 Anggaran Harian
            </button>
        </div>
    );
};
