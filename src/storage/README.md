# Offline Storage Notes

This folder holds the offline-first storage layer built on `@capacitor-community/sqlite`.  
Planned tables (per user scope):

- users (minimal profile for owner/device)
- customers
- items, services
- serial_numbers (child of items)
- stock_history (child of items)
- work_orders
- bills, bill_items (child)
- payment_history (child of bills)
- bank_accounts
- metadata (sync watermarks, deviceId, schema version, sync errors)

Conventions:
- `updated_at` columns drive last-write-wins conflict resolution.
- Soft deletes via `deleted` boolean.
- New records use client-generated UUID in `client_id` until server ID is mapped.
- All writes are queued for sync; reads come from SQLite.
