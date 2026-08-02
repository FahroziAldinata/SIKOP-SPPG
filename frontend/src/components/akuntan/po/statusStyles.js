export const cleanDateStr = (dStr) => dStr ? dStr.split('T')[0] : '';

export const getDatesInRange = (startDateStr, endDateStr) => {
    const dates = [];
    if (!startDateStr || !endDateStr) return dates;
    const [sY, sM, sD] = startDateStr.split('-').map(Number);
    const [eY, eM, eD] = endDateStr.split('-').map(Number);
    let current = new Date(Date.UTC(sY, sM - 1, sD));
    const end = new Date(Date.UTC(eY, eM - 1, eD));
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
};

export const getStatusStyle = (status) => {
    switch (status) {
        case 'DITERIMA':
            return { backgroundColor: 'rgba(40, 167, 69, 0.1)', color: '#28a745', border: '1px solid rgba(40, 167, 69, 0.2)' };
        case 'DIREALISASI':
            return { backgroundColor: 'rgba(0, 123, 255, 0.1)', color: '#007bff', border: '1px solid rgba(0, 123, 255, 0.2)' };
        case 'DIAJUKAN':
        default:
            return { backgroundColor: 'rgba(253, 126, 20, 0.1)', color: '#fd7e14', border: '1px solid rgba(253, 126, 20, 0.2)' };
    }
};
