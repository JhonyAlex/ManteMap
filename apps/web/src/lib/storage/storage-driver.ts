/**
 * Storage driver interface for file operations.
 * Abstracts file persistence to allow swapping between local filesystem
 * and cloud storage (e.g., S3) without changing business logic.
 */
export interface StorageDriver {
  /**
   * Write a file buffer to the given relative path.
   * Creates parent directories if they don't exist.
   * @returns The relative path of the written file.
   */
  writeFile(buffer: Buffer, relativePath: string): Promise<string>;

  /**
   * Read a file from the given relative path.
   * @throws {Error} with code 'ENOENT' if file does not exist.
   */
  readFile(relativePath: string): Promise<Buffer>;

  /**
   * Delete a file at the given relative path.
   * @throws {Error} with code 'ENOENT' if file does not exist.
   */
  deleteFile(relativePath: string): Promise<void>;

  /**
   * Check if a file exists at the given relative path.
   * Returns false for directories or missing files.
   */
  fileExists(relativePath: string): Promise<boolean>;
}
