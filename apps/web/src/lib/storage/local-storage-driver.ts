import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { StorageDriver } from './storage-driver';

/**
 * Local filesystem storage driver.
 *
 * Stores files under a configurable base directory with hierarchical paths:
 * `{base}/{projectId}/{itemId}/{versionId}-{filename}`
 *
 * Configuration via environment:
 * - `STORAGE_LOCAL_PATH` — base directory (default: `./storage`)
 */
export class LocalStorageDriver implements StorageDriver {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async writeFile(buffer: Buffer, relativePath: string): Promise<string> {
    const fullPath = this.resolve(relativePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, buffer);

    return relativePath;
  }

  async readFile(relativePath: string): Promise<Buffer> {
    const fullPath = this.resolve(relativePath);
    return fs.readFile(fullPath);
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.resolve(relativePath);
    await fs.unlink(fullPath);
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const fullPath = this.resolve(relativePath);
    try {
      const stat = await fs.stat(fullPath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Resolve a relative path to the full filesystem path.
   * Prevents path traversal by rejecting `..` segments.
   */
  private resolve(relativePath: string): string {
    if (relativePath.includes('..')) {
      throw new Error('Path traversal not allowed');
    }
    return path.join(this.basePath, relativePath);
  }
}
