import { createCacheReadStream } from '../../../util/fs';
import { hashStream } from '../../../util/hash';

/**
 * Computes the SHA256 checksum of a specified file.
 *
 * @param filePath - path of the file
 * @returns resolves to the SHA256 checksum
 */
export function computeFileChecksum(filePath: string): Promise<string> {
  const stream = createCacheReadStream(filePath);
  return hashStream(stream, 'sha256');
}
