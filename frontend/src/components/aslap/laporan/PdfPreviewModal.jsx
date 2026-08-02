import React from 'react';

export const PdfPreviewModal = ({
  isPdfModalOpen,
  pdfModalTitle,
  pdfUrl,
  setIsPdfModalOpen,
  setPdfUrl
}) => {
  if (!isPdfModalOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div
        style={{
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
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{pdfModalTitle}</h3>
          <button
            onClick={() => {
              setIsPdfModalOpen(false);
              if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl('');
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              lineHeight: 1,
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} title="PDF Preview" />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-secondary"
            onClick={() => {
              setIsPdfModalOpen(false);
              if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl('');
              }
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
