import { getOrCreateDatabase } from '../sqliteClient';

const columnExists = async (db, table, column) => {
    const res = await db.query(`PRAGMA table_info(${table});`);
    return (res.values || []).some((c) => c.name === column);
};

const addColumnIfMissing = async (db, table, column, definition) => {
    const exists = await columnExists(db, table, column);
    if (!exists) {
        await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    }
};

/**
 * Migration runner scaffold.
 * Add migration objects to the migrations array in order:
 * { id: 1, name: 'create tables', up: async (db) => { ... } }
 */
const migrations = [
    {
        id: 1,
        name: 'create base offline tables',
        up: async (db) => {
            // metadata key-value store
            await db.execute(`
                CREATE TABLE IF NOT EXISTS metadata (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TEXT
                );
            `);

            // customers
            await db.execute(`
                CREATE TABLE IF NOT EXISTS customers (
                    id TEXT PRIMARY KEY,
                    client_id TEXT,
                    customer_name TEXT,
                    phone_number TEXT,
                    whatsapp_number TEXT,
                    address TEXT,
                    created_by TEXT,
                    deleted INTEGER DEFAULT 0,
                    updated_at TEXT,
                    created_at TEXT
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers (created_by);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers (deleted);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers (updated_at DESC);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_customers_name_phone ON customers (customer_name, phone_number);');

            // items
            await db.execute(`
                CREATE TABLE IF NOT EXISTS items (
                    id TEXT PRIMARY KEY,
                    client_id TEXT,
                    item_type TEXT,
                    item_name TEXT,
                    unit TEXT,
                    warranty TEXT,
                    mrp REAL,
                    purchase_price REAL,
                    sale_price REAL,
                    stock_qty INTEGER,
                    created_by TEXT,
                    deleted INTEGER DEFAULT 0,
                    updated_at TEXT,
                    created_at TEXT
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_items_created_by ON items (created_by);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_items_deleted ON items (deleted);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items (updated_at DESC);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_items_name ON items (item_name);');

            // serial numbers
            await db.execute(`
                CREATE TABLE IF NOT EXISTS serial_numbers (
                    id TEXT PRIMARY KEY,
                    item_id TEXT,
                    serial_no TEXT,
                    status TEXT,
                    customer_name TEXT,
                    bill_number TEXT,
                    added_at TEXT,
                    deleted INTEGER DEFAULT 0,
                    updated_at TEXT,
                    created_at TEXT
                );
            `);
            await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_serial_numbers_serial_no ON serial_numbers (serial_no);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_serial_numbers_item_id ON serial_numbers (item_id);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_serial_numbers_deleted ON serial_numbers (deleted);');

            // stock history
            await db.execute(`
                CREATE TABLE IF NOT EXISTS stock_history (
                    id TEXT PRIMARY KEY,
                    item_id TEXT,
                    qty INTEGER,
                    added_at TEXT,
                    deleted INTEGER DEFAULT 0,
                    updated_at TEXT,
                    created_at TEXT
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_stock_history_item_id ON stock_history (item_id);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_stock_history_deleted ON stock_history (deleted);');

            // services
            await db.execute(`
                CREATE TABLE IF NOT EXISTS services (
                    id TEXT PRIMARY KEY,
                    client_id TEXT,
                    service_name TEXT,
                    service_price REAL,
                    created_by TEXT,
                    deleted INTEGER DEFAULT 0,
                    updated_at TEXT,
                    created_at TEXT
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_services_created_by ON services (created_by);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_services_deleted ON services (deleted);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_services_updated_at ON services (updated_at DESC);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_services_name ON services (service_name);');

            // work orders
            await db.execute(`
                CREATE TABLE IF NOT EXISTS work_orders (
                    id TEXT PRIMARY KEY,
                    client_id TEXT,
                    customer_id TEXT,
                    work_order_number TEXT,
                    note TEXT,
                    schedule_date TEXT,
                    has_scheduled_time INTEGER,
                    schedule_time TEXT,
                    status TEXT,
                    completed_at TEXT,
                    notification_sent INTEGER,
                    bill_id TEXT,
                    created_by TEXT,
                    deleted INTEGER DEFAULT 0,
                    updated_at TEXT,
                    created_at TEXT
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders (created_by);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders (status);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_work_orders_schedule_date ON work_orders (schedule_date);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_work_orders_deleted ON work_orders (deleted);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_work_orders_updated_at ON work_orders (updated_at DESC);');

            // bills
            await db.execute(`
                CREATE TABLE IF NOT EXISTS bills (
                    id TEXT PRIMARY KEY,
                    client_id TEXT,
                    customer_id TEXT,
                    bill_number TEXT,
                    subtotal REAL,
                    discount REAL,
                    total_amount REAL,
                    received_payment REAL,
                    due_amount REAL,
                    payment_method TEXT,
                    status TEXT,
                    work_order_id TEXT,
                    created_by TEXT,
                    deleted INTEGER DEFAULT 0,
                    updated_at TEXT,
                    created_at TEXT
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills (created_by);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills (customer_id);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills (bill_number);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bills_status ON bills (status);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bills_deleted ON bills (deleted);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bills_updated_at ON bills (updated_at DESC);');

            // bill items
            await db.execute(`
                CREATE TABLE IF NOT EXISTS bill_items (
                    id TEXT PRIMARY KEY,
                    bill_id TEXT,
                    item_type TEXT,
                    item_id TEXT,
                    item_name TEXT,
                    serial_number TEXT,
                    qty INTEGER,
                    price REAL,
                    purchase_price REAL,
                    amount REAL,
                    deleted INTEGER DEFAULT 0,
                    updated_at TEXT,
                    created_at TEXT
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items (bill_id);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bill_items_deleted ON bill_items (deleted);');

            // payment history
            await db.execute(`
                CREATE TABLE IF NOT EXISTS payment_history (
                    id TEXT PRIMARY KEY,
                    bill_id TEXT,
                    amount REAL,
                    paid_at TEXT,
                    note TEXT,
                    deleted INTEGER DEFAULT 0,
                    updated_at TEXT,
                    created_at TEXT
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_payment_history_bill_id ON payment_history (bill_id);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_payment_history_deleted ON payment_history (deleted);');

            // bank accounts
            await db.execute(`
                CREATE TABLE IF NOT EXISTS bank_accounts (
                    id TEXT PRIMARY KEY,
                    client_id TEXT,
                    bank_name TEXT,
                    account_number TEXT,
                    ifsc_code TEXT,
                    account_holder_name TEXT,
                    upi_id TEXT,
                    is_primary INTEGER,
                    created_by TEXT,
                    deleted INTEGER DEFAULT 0,
                    updated_at TEXT,
                    created_at TEXT
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bank_accounts_created_by ON bank_accounts (created_by);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON bank_accounts (is_primary);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bank_accounts_deleted ON bank_accounts (deleted);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bank_accounts_updated_at ON bank_accounts (updated_at DESC);');

            // fcm tokens (optional sync)
            await db.execute(`
                CREATE TABLE IF NOT EXISTS fcm_tokens (
                    id TEXT PRIMARY KEY,
                    token TEXT,
                    device TEXT,
                    user_id TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    deleted INTEGER DEFAULT 0
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens (user_id);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_fcm_tokens_deleted ON fcm_tokens (deleted);');
        }
    },
    {
        id: 2,
        name: 'add customer sync columns',
        up: async (db) => {
            await db.execute('ALTER TABLE customers ADD COLUMN pending_sync INTEGER DEFAULT 0;');
            await db.execute('ALTER TABLE customers ADD COLUMN sync_op TEXT;');
            await db.execute('ALTER TABLE customers ADD COLUMN sync_error TEXT;');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_customers_pending_sync ON customers (pending_sync);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_customers_sync_op ON customers (sync_op);');
        }
    },
    {
        id: 3,
        name: 'add work order sync columns',
        up: async (db) => {
            await db.execute('ALTER TABLE work_orders ADD COLUMN pending_sync INTEGER DEFAULT 0;');
            await db.execute('ALTER TABLE work_orders ADD COLUMN sync_op TEXT;');
            await db.execute('ALTER TABLE work_orders ADD COLUMN sync_error TEXT;');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_work_orders_pending_sync ON work_orders (pending_sync);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_work_orders_sync_op ON work_orders (sync_op);');
        }
    },
    {
        id: 4,
        name: 'add bill sync columns',
        up: async (db) => {
            await db.execute('ALTER TABLE bills ADD COLUMN pending_sync INTEGER DEFAULT 0;');
            await db.execute('ALTER TABLE bills ADD COLUMN sync_op TEXT;');
            await db.execute('ALTER TABLE bills ADD COLUMN sync_error TEXT;');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bills_pending_sync ON bills (pending_sync);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bills_sync_op ON bills (sync_op);');

            await db.execute('ALTER TABLE bill_items ADD COLUMN pending_sync INTEGER DEFAULT 0;');
            await db.execute('ALTER TABLE bill_items ADD COLUMN sync_op TEXT;');
            await db.execute('ALTER TABLE bill_items ADD COLUMN sync_error TEXT;');

            await db.execute('ALTER TABLE payment_history ADD COLUMN pending_sync INTEGER DEFAULT 0;');
            await db.execute('ALTER TABLE payment_history ADD COLUMN sync_op TEXT;');
            await db.execute('ALTER TABLE payment_history ADD COLUMN sync_error TEXT;');
        }
    },
    {
        id: 5,
        name: 'add inventory sync columns',
        up: async (db) => {
            // Items
            await addColumnIfMissing(db, 'items', 'client_id', 'TEXT');
            await addColumnIfMissing(db, 'items', 'pending_sync', 'INTEGER DEFAULT 0');
            await addColumnIfMissing(db, 'items', 'sync_op', 'TEXT');
            await addColumnIfMissing(db, 'items', 'sync_error', 'TEXT');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_items_pending_sync ON items (pending_sync);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_items_sync_op ON items (sync_op);');

            // Services
            await addColumnIfMissing(db, 'services', 'client_id', 'TEXT');
            await addColumnIfMissing(db, 'services', 'pending_sync', 'INTEGER DEFAULT 0');
            await addColumnIfMissing(db, 'services', 'sync_op', 'TEXT');
            await addColumnIfMissing(db, 'services', 'sync_error', 'TEXT');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_services_pending_sync ON services (pending_sync);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_services_sync_op ON services (sync_op);');

            // Serial numbers
            await addColumnIfMissing(db, 'serial_numbers', 'client_id', 'TEXT');
            await addColumnIfMissing(db, 'serial_numbers', 'pending_sync', 'INTEGER DEFAULT 0');
            await addColumnIfMissing(db, 'serial_numbers', 'sync_op', 'TEXT');
            await addColumnIfMissing(db, 'serial_numbers', 'sync_error', 'TEXT');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_serial_numbers_pending_sync ON serial_numbers (pending_sync);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_serial_numbers_sync_op ON serial_numbers (sync_op);');

            // Stock history
            await addColumnIfMissing(db, 'stock_history', 'client_id', 'TEXT');
            await addColumnIfMissing(db, 'stock_history', 'pending_sync', 'INTEGER DEFAULT 0');
            await addColumnIfMissing(db, 'stock_history', 'sync_op', 'TEXT');
            await addColumnIfMissing(db, 'stock_history', 'sync_error', 'TEXT');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_stock_history_pending_sync ON stock_history (pending_sync);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_stock_history_sync_op ON stock_history (sync_op);');
        }
    },
    {
        id: 6,
        name: 'add bank account sync columns',
        up: async (db) => {
            await db.execute('ALTER TABLE bank_accounts ADD COLUMN pending_sync INTEGER DEFAULT 0;');
            await db.execute('ALTER TABLE bank_accounts ADD COLUMN sync_op TEXT;');
            await db.execute('ALTER TABLE bank_accounts ADD COLUMN sync_error TEXT;');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bank_accounts_pending_sync ON bank_accounts (pending_sync);');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_bank_accounts_sync_op ON bank_accounts (sync_op);');
        }
    },
    {
        id: 7,
        name: 'add dashboard metrics cache',
        up: async (db) => {
            await db.execute(`
                CREATE TABLE IF NOT EXISTS dashboard_metrics (
                    key TEXT PRIMARY KEY,
                    payload TEXT,
                    updated_at TEXT
                );
            `);
            await db.execute('CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_updated_at ON dashboard_metrics (updated_at DESC);');
        }
    }
];

export const runMigrations = async () => {
    const db = await getOrCreateDatabase();

    // Track applied migrations in a simple table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );
    `);

    // Get already applied migrations
    const res = await db.query('SELECT id FROM _migrations');
    const appliedIds = new Set(res.values?.map((row) => row.id));

    for (const migration of migrations) {
        if (appliedIds.has(migration.id)) {
            continue;
        }

        await migration.up(db);
        await db.run(
            'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?);',
            [migration.id, migration.name, new Date().toISOString()]
        );
    }

    return db;
};

export default runMigrations;
