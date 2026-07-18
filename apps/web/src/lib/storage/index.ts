export type { StorageDriver } from './storage-driver';
export { LocalStorageDriver } from './local-storage-driver';

import type { StorageDriver } from './storage-driver';
import { LocalStorageDriver } from './local-storage-driver';

/**
 * Factory: create a StorageDriver from environment configuration.
 *
 * Environment variables:
 * - `STORAGE_DRIVER`: 'local' (default) | 's3' (future)
 * - `STORAGE_LOCAL_PATH`: base path for local driver (default: './storage')
 *
 * @throws {Error} if an unsupported driver is configured.
 */
export function getStorageDriver(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? 'local';

  switch (driver) {
    case 'local': {
      const basePath = process.env.STORAGE_LOCAL_PATH ?? './storage';
      return new LocalStorageDriver(basePath);
    }
    // case 's3':
    //   return new S3StorageDriver(...);
    default:
      throw new Error(`Unsupported storage driver: ${driver}`);
  }
}
