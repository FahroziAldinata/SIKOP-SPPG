export const categoryLabelMap = {
  SD_1_3: 'Kelas 1-3',
  SD_4_6: 'Kelas 4-6',
  SMP_1_3: 'Kelas 1-3',
  SMA_SMK_4_6: 'Kelas 4-6',
  PAUD_TK: 'PAUD / TK',
  PENDIDIK: 'Pendidik',
  TENAGA_KEPENDIDIKAN: 'PIC',
  ATS_KURANG_9TH: 'ATS < 9 Tahun',
  ATS_9_18TH: 'ATS 9-18 Tahun',
  BUMIL: 'Ibu Hamil',
  BUSUI: 'Ibu Menyusui',
  BALITA: 'Balita',
  KADER_POSYANDU: 'Kader Posyandu'
};

export const getKelasLabel = (namaKelas, fallbackNama) => {
  if (namaKelas && categoryLabelMap[namaKelas]) {
    return categoryLabelMap[namaKelas];
  }
  return fallbackNama || namaKelas || '';
};

export const getDefaultKelas = (jenjang) => {
  switch (jenjang) {
    case 'TK':
      return [
        { namaKelas: 'PAUD/TK', label: 'PAUD/TK', kode: 'PAUD_TK' },
        { namaKelas: 'Pendidik', label: 'Pendidik', kode: 'PENDIDIK' },
        { namaKelas: 'PIC', label: 'PIC', kode: 'TENAGA_KEPENDIDIKAN' }
      ];
    case 'SD':
      return [
        { namaKelas: 'Kelas 1', label: 'Kelas 1', kode: 'SD_1_3' },
        { namaKelas: 'Kelas 2', label: 'Kelas 2', kode: 'SD_1_3' },
        { namaKelas: 'Kelas 3', label: 'Kelas 3', kode: 'SD_1_3' },
        { namaKelas: 'Kelas 4', label: 'Kelas 4', kode: 'SD_4_6' },
        { namaKelas: 'Kelas 5', label: 'Kelas 5', kode: 'SD_4_6' },
        { namaKelas: 'Kelas 6', label: 'Kelas 6', kode: 'SD_4_6' },
        { namaKelas: 'Pendidik', label: 'Pendidik', kode: 'PENDIDIK' },
        { namaKelas: 'PIC', label: 'PIC', kode: 'TENAGA_KEPENDIDIKAN' }
      ];
    case 'SMP':
      return [
        { namaKelas: 'Kelas 1', label: 'Kelas 1', kode: 'SMP_1_3' },
        { namaKelas: 'Kelas 2', label: 'Kelas 2', kode: 'SMP_1_3' },
        { namaKelas: 'Kelas 3', label: 'Kelas 3', kode: 'SMP_1_3' },
        { namaKelas: 'Pendidik', label: 'Pendidik', kode: 'PENDIDIK' },
        { namaKelas: 'PIC', label: 'PIC', kode: 'TENAGA_KEPENDIDIKAN' }
      ];
    case 'SMA_SMK':
      return [
        { namaKelas: 'Kelas 4', label: 'Kelas 4', kode: 'SMA_SMK_4_6' },
        { namaKelas: 'Kelas 5', label: 'Kelas 5', kode: 'SMA_SMK_4_6' },
        { namaKelas: 'Kelas 6', label: 'Kelas 6', kode: 'SMA_SMK_4_6' },
        { namaKelas: 'Pendidik', label: 'Pendidik', kode: 'PENDIDIK' },
        { namaKelas: 'PIC', label: 'PIC', kode: 'TENAGA_KEPENDIDIKAN' }
      ];
    default:
      return [
        { namaKelas: 'Pendidik', label: 'Pendidik', kode: 'PENDIDIK' },
        { namaKelas: 'PIC', label: 'PIC', kode: 'TENAGA_KEPENDIDIKAN' }
      ];
  }
};

export const jenjangOptions = [
  { value: 'TK', label: 'TK/PAUD' },
  { value: 'SD', label: 'SD' },
  { value: 'SMP', label: 'SMP' },
  { value: 'SMA_SMK', label: 'SMA/SMK' }
];
