import React from 'react';

export const RabP12PdfModal = ({
    isPdfModalOpen,
    pdfUrl,
    setIsPdfModalOpen,
    setPdfUrl
}) => {
    if (!isPdfModalOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated, #fff)', borderRadius: 'var(--radius-md, 8px)',
                width: '90%', height: '90%', display: 'flex', flexDirection: 'column',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', padding: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text)' }}>Preview PDF RAB P12</h3>
                    <button
                        onClick={() => {
                            setIsPdfModalOpen(false);
                            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
                            setPdfUrl(null);
                        }}
                        style={{
                            padding: '6px 16px', backgroundColor: 'var(--color-danger, #ef4444)',
                            color: '#fff', border: 'none', borderRadius: 'var(--radius-sm, 4px)',
                            cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        Tutup
                    </button>
                </div>
                <div style={{ flex: 1, width: '100%', height: '100%' }}>
                    <iframe src={pdfUrl} title="PDF RAB P12" style={{ width: '100%', height: '100%', border: 'none' }} />
                </div>
            </div>
        </div>
    );
};
