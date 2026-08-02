import React from 'react';

export const PdfPreviewModal = ({ isPdfModalOpen, pdfModalTitle, pdfUrl, setIsPdfModalOpen, setPdfUrl }) => {
    return (
        <>
            {isPdfModalOpen && (
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
                    zIndex: 10000,
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '24px',
                        width: '85%',
                        maxWidth: '1000px',
                        height: '85vh',
                        boxShadow: 'var(--shadow-hover)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                                {pdfModalTitle}
                            </h3>
                            <button 
                                onClick={() => {
                                    setIsPdfModalOpen(false);
                                    if (pdfUrl) {
                                        URL.revokeObjectURL(pdfUrl);
                                        setPdfUrl('');
                                    }
                                }} 
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    padding: '0 8px'
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} title="PDF Preview" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    setIsPdfModalOpen(false);
                                    if (pdfUrl) {
                                        URL.revokeObjectURL(pdfUrl);
                                        setPdfUrl('');
                                    }
                                }} 
                                className="btn-secondary"
                                style={{
                                    padding: '10px 20px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    backgroundColor: 'transparent',
                                    color: 'var(--text)'
                                }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
