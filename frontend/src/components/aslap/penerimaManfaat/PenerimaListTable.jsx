import React from 'react';
import { Table } from '../../Table';
import { getKelasLabel } from './constants';

export const PenerimaListTable = ({
  items,
  categoriesById,
  populateFormFromRow,
  handleDeleteClick,
  getKelasLabel: getKelasLabelProp
}) => {
  const resolveGetKelasLabel = getKelasLabelProp || getKelasLabel;

  return (
    <Table
      columns={[
        {
          key: 'grupHari',
          header: 'Grup Hari',
          width: '180px',
          render: (val, row) => (
            <div>
              <strong style={{ color: 'var(--text)', display: 'block' }}>
                {val?.label || 'Grup Custom'}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {(val?.hariAktif || row.hariAktif || []).join(', ')}
              </span>
            </div>
          )
        },
        {
          key: 'createdBy',
          header: 'Pembuat',
          render: (val) => val?.nama || 'System'
        },
        {
          key: 'detail',
          header: 'Rincian Detail Penerima (Sasaran & Jumlah)',
          render: (val) => {
            if (!val || !Array.isArray(val)) return '-';

            const atsItems = [];
            const schoolMap = {};
            const posyanduMap = {};

            let grandL = 0;
            let grandP = 0;
            let grandPIC = 0;

            val.forEach(d => {
              const cat = d.kategori || categoriesById[d.kategoriId];
              const kode = cat?.kode;
              const l = Number(d.lakiLaki) || 0;
              const p = Number(d.perempuan) || 0;

              grandL += l;
              grandP += p;

              const isPic = kode === 'PENDIDIK' || kode === 'TENAGA_KEPENDIDIKAN' || d.namaKelas === 'Pendidik' || d.namaKelas === 'PIC' || d.namaKelas === 'TENAGA_KEPENDIDIKAN';
              if (isPic) {
                grandPIC += (l + p);
              }

              const sNama = d.sekolah?.nama || d.sekolahNama;
              const pNama = d.posyandu?.nama || d.posyanduNama;

              if (['ATS_KURANG_9TH', 'ATS_9_18TH'].includes(kode)) {
                atsItems.push(d);
              } else if (sNama) {
                if (!schoolMap[sNama]) schoolMap[sNama] = [];
                schoolMap[sNama].push(d);
              } else if (pNama) {
                if (!posyanduMap[pNama]) posyanduMap[pNama] = [];
                posyanduMap[pNama].push(d);
              }
            });

            const grandTotal = grandL + grandP;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                {atsItems.length > 0 && (
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>[ATS]: </span>
                    {atsItems.map((d, i) => (
                      <span key={d.id || i} style={{ marginRight: '10px' }}>
                        {d.kategori?.nama || categoriesById[d.kategoriId]?.nama} (L:{d.lakiLaki}, P:{d.perempuan})
                      </span>
                    ))}
                  </div>
                )}

                {Object.entries(schoolMap).map(([name, list]) => {
                  let schoolL = 0;
                  let schoolP = 0;
                  let schoolPIC = 0;

                  list.forEach(d => {
                    const cat = d.kategori || categoriesById[d.kategoriId];
                    const kode = cat?.kode;
                    const l = Number(d.lakiLaki) || 0;
                    const p = Number(d.perempuan) || 0;
                    schoolL += l;
                    schoolP += p;

                    const isPic = kode === 'PENDIDIK' || kode === 'TENAGA_KEPENDIDIKAN' || d.namaKelas === 'Pendidik' || d.namaKelas === 'PIC' || d.namaKelas === 'TENAGA_KEPENDIDIKAN';
                    if (isPic) {
                      schoolPIC += (l + p);
                    }
                  });

                  const schoolGrand = schoolL + schoolP;

                  return (
                    <div key={name} style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '6px' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{name}: </span>
                        {list.map((d, i) => {
                          const catNama = d.kategori?.nama || categoriesById[d.kategoriId]?.nama;
                          const label = d.namaKelas || d.label || resolveGetKelasLabel(d.kategori?.kode, catNama);
                          return (
                            <span key={d.id || i} style={{ marginRight: '10px' }}>
                              {label || catNama} (L:{d.lakiLaki}, P:{d.perempuan})
                            </span>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: '4px', fontWeight: 700, fontSize: '12px' }}>
                        <span>TOTAL {name}: </span>
                        L: <strong style={{ color: 'var(--color-primary)' }}>{schoolL}</strong> | P: <strong style={{ color: 'var(--color-primary)' }}>{schoolP}</strong> | PIC: <strong style={{ color: 'var(--color-primary)' }}>{schoolPIC}</strong> | Grand: <strong style={{ color: 'var(--color-primary)' }}>{schoolGrand}</strong>
                      </div>
                    </div>
                  );
                })}

                {Object.entries(posyanduMap).map(([name, list]) => {
                  let posyanduL = 0;
                  let posyanduP = 0;

                  list.forEach(d => {
                    const l = Number(d.lakiLaki) || 0;
                    const p = Number(d.perempuan) || 0;
                    posyanduL += l;
                    posyanduP += p;
                  });

                  const posyanduGrand = posyanduL + posyanduP;

                  return (
                    <div key={name} style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '6px' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{name}: </span>
                        {list.map((d, i) => (
                          <span key={d.id || i} style={{ marginRight: '10px' }}>
                            {resolveGetKelasLabel(d.kategori?.kode, d.kategori?.nama || categoriesById[d.kategoriId]?.nama)} (L:{d.lakiLaki}, P:{d.perempuan})
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop: '4px', fontWeight: 700, fontSize: '12px' }}>
                        <span>TOTAL {name}: </span>
                        L: <strong style={{ color: 'var(--color-primary)' }}>{posyanduL}</strong> | P: <strong style={{ color: 'var(--color-primary)' }}>{posyanduP}</strong> | Grand: <strong style={{ color: 'var(--color-primary)' }}>{posyanduGrand}</strong>
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--border)', fontWeight: 700, fontSize: '12px' }}>
                  <span>GRAND TOTAL: </span>
                  L: <strong style={{ color: 'var(--color-primary)' }}>{grandL}</strong> | P: <strong style={{ color: 'var(--color-primary)' }}>{grandP}</strong> | PIC: <strong style={{ color: 'var(--color-primary)' }}>{grandPIC}</strong> | Grand: <strong style={{ color: 'var(--color-primary)' }}>{grandTotal}</strong>
                </div>
              </div>
            );
          }
        },
        {
          key: 'id',
          header: 'Aksi',
          align: 'center',
          width: '130px',
          render: (val, row) => (
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
              <button onClick={() => populateFormFromRow(row)} style={{ padding: '3px 8px', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => handleDeleteClick(val)} style={{ padding: '3px 8px', color: 'red', cursor: 'pointer' }}>Hapus</button>
            </div>
          )
        }
      ]}
      data={items}
      emptyText="Belum ada data penerima manfaat untuk periode ini."
    />
  );
};
