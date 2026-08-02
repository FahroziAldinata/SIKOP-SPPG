export const KOMPONEN_LABEL = {
    KARBOHIDRAT: 'Karbohidrat Utama',
    LAUK_HEWANI: 'Lauk Hewani',
    LAUK_NABATI: 'Lauk Nabati',
    SAYUR: 'Sayur',
    BUAH: 'Buah / Pelengkap'
};

export const calculateBlockGizi = (blok) => {
    const target = blok.targetGizi || {};
    let totalEnergi = 0;
    let totalProtein = 0;
    let totalLemak = 0;
    let totalKarbo = 0;
    let totalSerat = 0;
    let totalBiayaPorsi = 0;

    (blok.menuItem || []).forEach(item => {
        (item.bahan || []).forEach(b => {
            totalEnergi += Number(b.energiKkal || 0);
            totalProtein += Number(b.proteinGr || 0);
            totalLemak += Number(b.lemakGr || 0);
            totalKarbo += Number(b.karbohidratGr || 0);
            totalSerat += Number(b.seratGr || 0);
            totalBiayaPorsi += Number(b.totalHargaBahan || 0);
        });
    });

    const getPercent = (real, tgt) => {
        const t = Number(tgt || 0);
        if (!t) return '-';
        return Math.round((real / t) * 100) + '%';
    };

    return {
        target: {
            energi: Number(target.targetEnergi || 0),
            protein: Number(target.targetProtein || 0),
            lemak: Number(target.targetLemak || 0),
            karbo: Number(target.targetKarbohidrat || 0),
            serat: Number(target.targetSerat || 0),
        },
        realisasi: {
            energi: Math.round(totalEnergi * 10) / 10,
            protein: Math.round(totalProtein * 10) / 10,
            lemak: Math.round(totalLemak * 10) / 10,
            karbo: Math.round(totalKarbo * 10) / 10,
            serat: Math.round(totalSerat * 10) / 10,
        },
        pct: {
            energi: getPercent(totalEnergi, target.targetEnergi),
            protein: getPercent(totalProtein, target.targetProtein),
            lemak: getPercent(totalLemak, target.targetLemak),
            karbo: getPercent(totalKarbo, target.targetKarbohidrat),
            serat: getPercent(totalSerat, target.targetSerat),
        },
        totalBiayaPorsi,
        totalBiayaPenerima: totalBiayaPorsi * Number(blok.totalPenerima || 0)
    };
};
