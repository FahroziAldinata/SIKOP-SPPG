import React from 'react';
import { Skeleton } from '../../ui/Skeleton';

export const PoPdfPreviewModal = ({
    isPdfModalOpen,
    pdfModalTitle,
    pdfUrl,
    pdfLoading,
    closePdfModal,
}) => {
    if (!isPdfModalOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                width: '100%',
                maxWidth: '900px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-hover)'
            }}>
                <h3 style={{ margin: '0 0 15px 0' }}>{pdfModalTitle}</h3>

                {pdfLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                        <Skeleton height="560px" />
                    </div>
                ) : (
                    <iframe
                        src={pdfUrl}
                        style={{ width: '100%', flex: 1, minHeight: '560px', border: 'none', borderRadius: 'var(--radius-sm)' }}
                        title="Nota Pesanan PDF"
                    />
                )}

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {pdfUrl && (
                        <a
                            href={pdfUrl}
                            download={`${pdfModalTitle.replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf`}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#007bff',
                                color: '#fff',
                                textDecoration: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }}
                        >
                            Download PDF
                        </a>
                    )}
                    <button
                        onClick={closePdfModal}
                        style={{ padding: '8px 16px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};
