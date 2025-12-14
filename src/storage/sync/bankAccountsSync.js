import SummaryApi from '../../common';
import { getBankAccountsDao } from '../dao/bankAccountsDao';
import { apiClient } from '../../utils/apiClient';

const fetchJSON = async (url, method = 'GET') => {
    const res = await apiClient(url, { method });
    if (!res.ok) throw new Error(`Bank accounts pull failed: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Bank accounts pull error');
    return data;
};

export const pullBankAccounts = async () => {
    const dao = await getBankAccountsDao();
    let page = 1;
    const limit = 200;
    let hasMore = true;

    while (hasMore) {
        const data = await fetchJSON(`${SummaryApi.getAllBankAccounts.url}?page=${page}&limit=${limit}`, SummaryApi.getAllBankAccounts.method);
        if (Array.isArray(data.bankAccounts)) {
            await dao.upsertMany(data.bankAccounts);
        }
        if (data.pagination && typeof data.pagination.hasMore === 'boolean') {
            hasMore = data.pagination.hasMore;
            page = (data.pagination.currentPage || page) + 1;
        } else {
            hasMore = false;
        }
    }
};

export default {
    pullBankAccounts
};
