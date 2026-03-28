import type { ReleaseResult } from '..';
import type { PackageDescription } from './types';

/**
 * Formats the package description into a ReleaseResult.
 *
 * @param packagesDesc - list of package description objects.
 * @returns A formatted ReleaseResult.
 */
export function formatReleaseResult(
  packagesDesc: PackageDescription[],
): ReleaseResult {
  return {
    releases: packagesDesc.map((p) => ({ version: p.V! })),
    homepage: packagesDesc[0]?.U,
  };
}
