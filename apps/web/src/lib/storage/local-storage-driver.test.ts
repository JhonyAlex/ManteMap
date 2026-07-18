import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageDriver } from './storage-driver';

// ---------------------------------------------------------------------------
// Mocks — fs/promises
// ---------------------------------------------------------------------------

const mockWriteFile = vi.fn();
const mockReadFile = vi.fn();
const mockUnlink = vi.fn();
const mockMkdir = vi.fn();
const mockStat = vi.fn();

vi.mock('node:fs/promises', () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  stat: (...args: unknown[]) => mockStat(...args),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { LocalStorageDriver } from './local-storage-driver';

// ---------------------------------------------------------------------------
// Fixtures — use path.join for cross-platform paths
// ---------------------------------------------------------------------------

const BASE_PATH = path.join('tmp', 'test-storage');
const PROJECT_ID = 'proj-abc123';
const ITEM_ID = 'item-def456';
const VERSION_ID = 'ver-ghi789';
const FILENAME = 'report.pdf';
const RELATIVE_PATH = path.join(PROJECT_ID, ITEM_ID, `${VERSION_ID}-${FILENAME}`);
const FILE_CONTENT = Buffer.from('test file content');
const EXPECTED_FULL_PATH = path.join(BASE_PATH, RELATIVE_PATH);

// ---------------------------------------------------------------------------
// StorageDriver interface compliance
// ---------------------------------------------------------------------------

describe('LocalStorageDriver', () => {
  let driver: StorageDriver;

  beforeEach(() => {
    vi.clearAllMocks();
    driver = new LocalStorageDriver(BASE_PATH);
  });

  // -------------------------------------------------------------------------
  // writeFile
  // -------------------------------------------------------------------------
  describe('writeFile', () => {
    it('creates parent directories recursively', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await driver.writeFile(FILE_CONTENT, RELATIVE_PATH);

      expect(mockMkdir).toHaveBeenCalledWith(
        path.join(BASE_PATH, PROJECT_ID, ITEM_ID),
        { recursive: true }
      );
    });

    it('writes file buffer to the correct path', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await driver.writeFile(FILE_CONTENT, RELATIVE_PATH);

      expect(mockWriteFile).toHaveBeenCalledWith(EXPECTED_FULL_PATH, FILE_CONTENT);
    });

    it('returns the relative path on success', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await driver.writeFile(FILE_CONTENT, RELATIVE_PATH);

      expect(result).toBe(RELATIVE_PATH);
    });

    it('throws when mkdir fails', async () => {
      mockMkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(
        driver.writeFile(FILE_CONTENT, RELATIVE_PATH)
      ).rejects.toThrow('Permission denied');
    });

    it('throws when writeFile fails', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockRejectedValue(new Error('Disk full'));

      await expect(
        driver.writeFile(FILE_CONTENT, RELATIVE_PATH)
      ).rejects.toThrow('Disk full');
    });
  });

  // -------------------------------------------------------------------------
  // readFile
  // -------------------------------------------------------------------------
  describe('readFile', () => {
    it('reads file from the correct path', async () => {
      mockReadFile.mockResolvedValue(FILE_CONTENT);

      const result = await driver.readFile(RELATIVE_PATH);

      expect(mockReadFile).toHaveBeenCalledWith(EXPECTED_FULL_PATH);
      expect(result).toEqual(FILE_CONTENT);
    });

    it('throws when file does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      await expect(
        driver.readFile('nonexistent/path/file.pdf')
      ).rejects.toThrow();
    });

    it('returns file content as Buffer', async () => {
      const content = Buffer.from('PDF content here');
      mockReadFile.mockResolvedValue(content);

      const result = await driver.readFile(RELATIVE_PATH);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('PDF content here');
    });
  });

  // -------------------------------------------------------------------------
  // deleteFile
  // -------------------------------------------------------------------------
  describe('deleteFile', () => {
    it('deletes file at the correct path', async () => {
      mockUnlink.mockResolvedValue(undefined);

      await driver.deleteFile(RELATIVE_PATH);

      expect(mockUnlink).toHaveBeenCalledWith(EXPECTED_FULL_PATH);
    });

    it('throws when file does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockUnlink.mockRejectedValue(error);

      await expect(
        driver.deleteFile('nonexistent/path/file.pdf')
      ).rejects.toThrow();
    });

    it('throws when permission denied', async () => {
      const error = new Error('EACCES') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      mockUnlink.mockRejectedValue(error);

      await expect(
        driver.deleteFile(RELATIVE_PATH)
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // fileExists
  // -------------------------------------------------------------------------
  describe('fileExists', () => {
    it('returns true when file exists', async () => {
      mockStat.mockResolvedValue({ isFile: () => true });

      const result = await driver.fileExists(RELATIVE_PATH);

      expect(result).toBe(true);
      expect(mockStat).toHaveBeenCalledWith(EXPECTED_FULL_PATH);
    });

    it('returns false when file does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockStat.mockRejectedValue(error);

      const result = await driver.fileExists(RELATIVE_PATH);

      expect(result).toBe(false);
    });

    it('returns false when path is a directory', async () => {
      mockStat.mockResolvedValue({ isFile: () => false });

      const result = await driver.fileExists(RELATIVE_PATH);

      expect(result).toBe(false);
    });
  });
});
