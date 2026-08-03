import React from 'react';
import { Table, renderDate, renderStatus, renderTruncate } from '../../ui/Table';

export const RiwayatApprovalTable = ({ approvalList, renderDate: customRenderDate, renderStatus: customRenderStatus, renderTruncate: customRenderTruncate }) => {
    const dateRenderer = customRenderDate || renderDate;
    const statusRenderer = customRenderStatus || renderStatus;
    const truncateRenderer = customRenderTruncate || renderTruncate;

    return (
        <>
            <h3>Riwayat Approval</h3>
            <Table
                columns={[
                    {
                        key: 'id',
                        header: 'Jenis',
                        render: (_, row) => row.menuHarian ? 'Menu Harian' : 'RAB Harian'
                    },
                    {
                        key: 'id',
                        header: 'Tanggal Dokumen',
                        render: (_, row) => dateRenderer(row.menuHarian ? row.menuHarian.tanggal : row.rabHarian?.tanggal)
                    },
                    { key: 'status', header: 'Status', render: (v) => statusRenderer(v) },
                    { key: 'catatan', header: 'Catatan', render: (v) => truncateRenderer(v) },
                    { key: 'approvedBy', header: 'Diproses Oleh', render: (v) => v?.nama || v?.username || '-' },
                    {
                        key: 'createdAt',
                        header: 'Waktu Approval',
                        render: (v) => new Date(v).toLocaleString('id-ID')
                    }
                ]}
                data={approvalList}
                emptyText="Belum ada riwayat approval untuk periode ini."
            />
        </>
    );
};
