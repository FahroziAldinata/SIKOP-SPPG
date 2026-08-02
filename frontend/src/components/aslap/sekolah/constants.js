export const JENJANG_OPTIONS = ['TK', 'SD', 'SMP', 'SMA_SMK'];

export const getCategoryOptions = (jenjang) => {
  switch (jenjang) {
    case 'TK':
      return [
        { label: 'PAUD/TK (Porsi Kecil)', value: 'PAUD_TK' },
        { label: 'Pendidik (Porsi Besar)', value: 'PENDIDIK' },
        { label: 'PIC (Porsi Besar)', value: 'TENAGA_KEPENDIDIKAN' }
      ];
    case 'SD':
      return [
        { label: 'Kelas 1-3 (Porsi Kecil)', value: 'SD_1_3' },
        { label: 'Kelas 4-6 (Porsi Besar)', value: 'SD_4_6' },
        { label: 'Pendidik (Porsi Besar)', value: 'PENDIDIK' },
        { label: 'PIC (Porsi Besar)', value: 'TENAGA_KEPENDIDIKAN' }
      ];
    case 'SMP':
      return [
        { label: 'Kelas 1-3 (Porsi Besar)', value: 'SMP_1_3' },
        { label: 'Pendidik (Porsi Besar)', value: 'PENDIDIK' },
        { label: 'PIC (Porsi Besar)', value: 'TENAGA_KEPENDIDIKAN' }
      ];
    case 'SMA_SMK':
    default:
      return [
        { label: 'Kelas 4-6 (Porsi Besar)', value: 'SMA_SMK_4_6' },
        { label: 'Pendidik (Porsi Besar)', value: 'PENDIDIK' },
        { label: 'PIC (Porsi Besar)', value: 'TENAGA_KEPENDIDIKAN' }
      ];
  }
};

export const categoryLabelMap = {
  PAUD_TK: 'PAUD/TK (Porsi Kecil)',
  SD_1_3: 'Kelas 1-3 (Porsi Kecil)',
  SD_4_6: 'Kelas 4-6 (Porsi Besar)',
  SMP_1_3: 'Kelas 1-3 (Porsi Besar)',
  SMA_SMK_4_6: 'Kelas 4-6 (Porsi Besar)',
  PENDIDIK: 'Pendidik (Porsi Besar)',
  TENAGA_KEPENDIDIKAN: 'PIC (Porsi Besar)'
};
