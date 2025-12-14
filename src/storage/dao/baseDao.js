/**
 * Base DAO helper to wrap common SQLite CRUD operations.
 * Concrete DAOs should provide tableName and mapping helpers.
 */
export class BaseDao {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }

    async all(whereClause = '', params = []) {
        const query = `SELECT * FROM ${this.tableName} ${whereClause}`;
        const res = await this.db.query(query, params);
        return res.values || [];
    }

    async getById(id) {
        const res = await this.db.query(
            `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`,
            [id]
        );
        return res.values?.[0] || null;
    }

    async insert(columns, values) {
        const placeholders = columns.map(() => '?').join(',');
        const query = `INSERT INTO ${this.tableName} (${columns.join(',')}) VALUES (${placeholders})`;
        await this.db.run(query, values);
    }

    async update(setClause, params, whereClause = 'id = ?') {
        const query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`;
        await this.db.run(query, params);
    }

    async softDelete(id) {
        await this.db.run(
            `UPDATE ${this.tableName} SET deleted = 1, updated_at = ? WHERE id = ?`,
            [new Date().toISOString(), id]
        );
    }
}

export default BaseDao;
