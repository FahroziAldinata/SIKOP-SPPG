import React from 'react';
import { Skeleton } from '../../ui/Skeleton';
import { Card } from '../../ui/Card';

export const RingkasanAnggaranCards = ({ ringkasanLoading, ringkasanAnggaran, totalRingkasan }) => {
    return (
        <>
            {ringkasanLoading && (
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} height="100px" style={{ flex: 1 }} />)}
                </div>
            )}
            {!ringkasanLoading && ringkasanAnggaran.length > 0 && (
                <>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                        {ringkasanAnggaran.map((item, idx) => (
                            <Card key={idx} style={{ flex: 1, padding: '15px' }} hover={false}>
                                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                                    letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                    {item.label}
                                </div>
                                <div style={{ fontSize: '13px', lineHeight: '1.8', color: 'var(--text)' }}>
                                    <div>RAB: <strong>Rp{Number(item.totalRAB).toLocaleString('id-ID')}</strong></div>
                                    <div>Aktual: <strong>Rp{Number(item.totalAktual).toLocaleString('id-ID')}</strong></div>
                                    <div>Selisih: <strong style={{
                                        color: Number(item.totalSelisih) >= 0 ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)'
                                    }}>Rp{Number(Math.abs(item.totalSelisih)).toLocaleString('id-ID')}</strong></div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {item.jumlahTransaksi} transaksi
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                    {totalRingkasan && (
                        <Card style={{ display: 'flex', gap: '20px', padding: '12px 15px', marginBottom: '15px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }} hover={false}>
                            <span>Total RAB: <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(totalRingkasan.totalRAB).toLocaleString('id-ID')}</span></span>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <span>Total Aktual: <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rp{Number(totalRingkasan.totalAktual).toLocaleString('id-ID')}</span></span>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <span>Sisa: <span style={{
                                fontVariantNumeric: 'tabular-nums',
                                color: Number(totalRingkasan.surplusUtang) >= 0 ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)'
                            }}>Rp{Number(Math.abs(totalRingkasan.surplusUtang)).toLocaleString('id-ID')}</span></span>
                        </Card>
                    )}
                </>
            )}
        </>
    );
};
