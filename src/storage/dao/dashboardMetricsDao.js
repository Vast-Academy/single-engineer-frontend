import { BaseDao } from './baseDao';
import { initStorage } from '..';

const TABLE = 'dashboard_metrics';
const safeVal = (v, fallback = null) => (v === undefined ? fallback : v);

class DashboardMetricsDao extends BaseDao {
    constructor(db) {
        super(db, TABLE);
    }

    async upsert(key, payload) {
        const now = new Date().toISOString();
        const existing = await this.getByKey(key);
        if (!existing) {
            await this.insert(['key', 'payload', 'updated_at'], [key, JSON.stringify(safeVal(payload, {})), now]);
        } else {
            await this.update('payload = ?, updated_at = ?', [JSON.stringify(safeVal(payload, {})), now, key], 'key = ?');
        }
    }

    async getByKey(key) {
        const res = await this.db.query(`SELECT * FROM ${TABLE} WHERE key = ? LIMIT 1`, [key]);
        return res.values?.[0] || null;
    }
}

let dashboardDao;

export const getDashboardMetricsDao = async () => {
    if (dashboardDao) return dashboardDao;
    const db = await initStorage();
    dashboardDao = new DashboardMetricsDao(db);
    return dashboardDao;
};

export default getDashboardMetricsDao;
