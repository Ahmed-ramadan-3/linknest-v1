import { DB_VERSION } from '../../config/app';

export const STORES = {
  resources: 'resources',
  categories: 'categories',
  meta: 'meta',
} as const;

export interface Migration {
  /** The database version this migration upgrades to. */
  version: number;
  up(db: IDBDatabase, tx: IDBTransaction): void;
}

/**
 * Ordered list of schema migrations. To change the structure later, append a new
 * entry with the next version number and raise DB_VERSION in config/app.ts. Existing
 * users are upgraded in place, in order, inside the browser's versionchange
 * transaction (so a failed migration rolls back). Never edit a shipped migration.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    up(db) {
      const resources = db.createObjectStore(STORES.resources, { keyPath: 'id' });
      resources.createIndex('categoryId', 'categoryId');
      resources.createIndex('createdAt', 'createdAt');
      resources.createIndex('updatedAt', 'updatedAt');

      const categories = db.createObjectStore(STORES.categories, { keyPath: 'id' });
      categories.createIndex('parentId', 'parentId');

      db.createObjectStore(STORES.meta, { keyPath: 'key' });
    },
  },
];

export function runMigrations(
  db: IDBDatabase,
  tx: IDBTransaction,
  oldVersion: number,
  newVersion: number,
): void {
  if (newVersion > DB_VERSION) throw new Error('Unsupported database version');
  for (const migration of migrations) {
    if (migration.version > oldVersion && migration.version <= newVersion) {
      migration.up(db, tx);
    }
  }
}
