import SummaryApi from '../../common';
import { getDashboardMetricsDao } from '../dao/dashboardMetricsDao';
import { apiClient } from '../../utils/apiClient';

const fetchJSON = async (url, method = 'GET') => {
    const res = await apiClient(url, { method });
    if (!res.ok) throw new Error(`Dashboard metrics pull failed: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Dashboard metrics error');
    return data;
};

const buildKey = (filterType, period, month, year) => {
    if (filterType === 'monthYear') {
        return `monthYear:${month || ''}-${year || ''}`;
    }
    return `period:${period || '1month'}`;
};

export const pullDashboardMetrics = async ({ filterType = 'period', period = '1month', month, year } = {}) => {
    const params = new URLSearchParams();
    params.append('filterType', filterType);
    if (filterType === 'period') {
        params.append('period', period);
    } else if (filterType === 'monthYear') {
        if (month) params.append('month', month);
        if (year) params.append('year', year);
    }

    const data = await fetchJSON(`${SummaryApi.getDashboardMetrics.url}?${params.toString()}`, SummaryApi.getDashboardMetrics.method);
    const payload = data?.data || {};
    const key = buildKey(filterType, period, month, year);
    const dao = await getDashboardMetricsDao();
    await dao.upsert(key, {
        ...payload,
        availableMonths: payload.availableMonths || [],
        availableYears: payload.availableYears || []
    });
    return { key, payload };
};

export { buildKey };

export default {
    pullDashboardMetrics,
    buildKey
};
