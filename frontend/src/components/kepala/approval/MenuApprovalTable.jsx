import React from 'react';
import { Table, renderDate, renderStatus } from '../../Table';

export const MenuApprovalTable = ({ pendingMenuList, openDetailModal, triggerSetujui, triggerTolak, renderDate: customRenderDate, renderStatus: customRenderStatus }) => {
    const dateRenderer = customRenderDate || renderDate;
    const statusRenderer = customRenderStatus || renderStatus;

    return (
        <>
            <h3>Menu Harian - Menunggu Persetujuan</h3>
            <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal', render: (v) => dateRenderer(v) },
                    { key: 'status', header: 'Status', render: (v) => statusRenderer(v) },
                    {
                        key: 'id',
                        header: 'Aksi',
                        render: (_, row) => (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => openDetailModal('MENU', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-primary, #0284c7)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Detail
                                </button>
                                <button
                                    onClick={() => triggerSetujui('MENU', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Setujui
                                </button>
                                <button
                                    onClick={() => triggerTolak('MENU', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-danger)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Tolak
                                </button>
                            </div>
                        )
                    }
                ]}
                data={pendingMenuList}
                emptyText="Tidak ada menu harian yang menunggu persetujuan."
            />
        </>
    );
};
