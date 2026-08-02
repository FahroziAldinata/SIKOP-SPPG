import React from 'react';
import { MenuDetailView } from './MenuDetailView';
import { RabDetailView } from './RabDetailView';

export const ApprovalDetailModal = ({ detailModalOpen, detailType, detailLoading, detailData, bahanPokokMap, closeDetailModal }) => {
    if (!detailModalOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated, #ffffff)',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '24px',
                width: '100%',
                maxWidth: '900px',
                maxHeight: '90vh',
                boxShadow: 'var(--shadow-hover, 0 10px 25px rgba(0,0,0,0.15))',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Modal Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '14px',
                    marginBottom: '16px',
                    borderBottom: '1px solid var(--border)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                        {detailType === 'MENU' ? 'Detail & Preview Menu Harian' : 'Detail & Preview RAB Harian'}
                    </h3>
                    <button
                        onClick={closeDetailModal}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '0 4px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Content / Body */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    {detailLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Memuat data detail...
                        </div>
                    ) : detailData ? (
                        detailType === 'MENU' ? (
                            <MenuDetailView detailData={detailData} bahanPokokMap={bahanPokokMap} />
                        ) : (
                            <RabDetailView detailData={detailData} />
                        )
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Data detail tidak ditemukan.
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '16px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border)'
                }}>
                    <button
                        onClick={closeDetailModal}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: 'var(--bg-muted, #e2e8f0)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm, 4px)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px'
                        }}
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};
