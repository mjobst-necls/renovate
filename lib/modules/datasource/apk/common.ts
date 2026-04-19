import type { PackageDescription } from './types.ts';

/**
 * This specifies the directory where the extracted and downloaded packages files are stored relative to cacheDir.
 * The folder will be created automatically if it doesn't exist.
 */
export const cacheSubDir = 'apk';

export const datasource = 'apk';

export const requiredPackageKeys: (keyof PackageDescription)[] = ['P', 'V'];

export const packageKeys: (keyof PackageDescription)[] = [
  ...requiredPackageKeys,
  'U',
];
