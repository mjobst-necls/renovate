import readline from 'readline';
import { nanoid } from 'nanoid';
import upath from 'upath';
import { logger } from '../../../logger';
import { cache } from '../../../util/cache/package/decorator';
import * as fs from '../../../util/fs';
import { toSha256 } from '../../../util/hash';
import type { HttpOptions } from '../../../util/http/types';
import { joinUrlParts } from '../../../util/url';
import { Datasource } from '../datasource';
import type { GetReleasesConfig, ReleaseResult } from '../types';
import { cacheSubDir, packageKeys, requiredPackageKeys } from './common';
import { extract } from './file';
import { formatReleaseResult } from './release';
import type { PackageDescription } from './types';
import * as packageCache from '../../../util/cache/package';

export class AlpineDatasource extends Datasource {
  static readonly id = 'alpine';

  constructor() {
    super(AlpineDatasource.id);
  }

  override readonly defaultVersioning = 'loose';

  /**
   * Parses the extracted package index file.
   *
   * @param extractedFile - The path to the extracted package file.
   * @param lastTimestamp - The timestamp of the last modification.
   * @returns a list of packages with minimal Metadata.
   */
  @cache({
    namespace: `datasource-${AlpineDatasource.id}`,
    key: (extractedFile: string, lastTimestamp: Date) =>
      `${extractedFile}:${lastTimestamp.getTime()}`,
    ttlMinutes: 24 * 60,
  })
  async parseExtractedPackageIndex(
    extractedFile: string,
    lastTimestamp: Date,
  ): Promise<Record<string, PackageDescription[]>> {
    // read line by line to avoid high memory consumption as the extracted Packages
    // files can be multiple MBs in size
    const rl = readline.createInterface({
      input: fs.createCacheReadStream(extractedFile),
      terminal: false,
    });

    let currentPackage: PackageDescription = {};
    // A Package Index can contain multiple Versions of the package on private Artifactory (e.g. Jfrog)
    const allPackages: Record<string, PackageDescription[]> = {};

    for await (const line of rl) {
      if (line === '') {
        // All information of the package are available, add to the list of packages
        if (requiredPackageKeys.every((key) => key in currentPackage)) {
          if (!allPackages[currentPackage.P!]) {
            allPackages[currentPackage.P!] = [];
          }
          allPackages[currentPackage.P!].push(currentPackage);
          currentPackage = {};
        }
      } else {
        for (const key of packageKeys) {
          if (line.startsWith(`${key}:`)) {
            currentPackage[key] = line.substring(key.length + 1).trim();
            break;
          }
        }
      }
    }

    // Check the last package after file reading is complete
    if (requiredPackageKeys.every((key) => key in currentPackage)) {
      if (!allPackages[currentPackage.P!]) {
        allPackages[currentPackage.P!] = [];
      }
      allPackages[currentPackage.P!].push(currentPackage);
    }

    return allPackages;
  }

  /**
   * Checks if a packageUrl content has been modified since the specified timestamp.
   *
   * @param packageUrl - The URL to check.
   * @param lastDownloadTimestamp - The timestamp of the last download.
   * @returns True if the content has been modified, otherwise false.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Modified-Since
   */
  private async checkIfModified(
    packageUrl: string,
    lastDownloadTimestamp: Date,
  ): Promise<boolean> {
    const options: HttpOptions = {
      headers: {
        'If-Modified-Since': lastDownloadTimestamp.toUTCString(),
      },
    };

    try {
      const response = await this.http.head(packageUrl, options);
      return response.statusCode !== 304;
    } catch (error) {
      logger.warn(
        { packageUrl, lastDownloadTimestamp, errorMessage: error.message },
        'Could not determine if package file is modified since last download',
      );
      return true; // Assume it needs to be downloaded if check fails
    }
  }

  /**
   * Downloads a package file if it has been modified since the last download timestamp.
   *
   * @param basePackageUrl - The base URL of the package.
   * @param compression - The compression method used (e.g., 'gz').
   * @param compressedFile - The path where the compressed file will be saved.
   * @param lastDownloadTimestamp - The timestamp of the last download.
   * @returns True if the file was downloaded, otherwise false.
   */
  private async downloadIndexFile(
    baseIndexUrl: string,
    compression: string,
    compressedFile: string,
    lastDownloadTimestamp?: Date,
  ): Promise<boolean> {
    const packageUrl = joinUrlParts(baseIndexUrl, `APKINDEX.${compression}`);
    let needsToDownload = true;

    if (lastDownloadTimestamp) {
      needsToDownload = await this.checkIfModified(
        packageUrl,
        lastDownloadTimestamp,
      );
    }

    if (!needsToDownload) {
      logger.debug(`No need to download ${packageUrl}, file is up to date.`);
      return false;
    }
    const readStream = this.http.stream(packageUrl);
    const writeStream = fs.createCacheWriteStream(compressedFile);
    await fs.pipeline(readStream, writeStream);
    logger.debug(
      { url: packageUrl, targetFile: compressedFile },
      'Downloading Alpine index file',
    );

    return needsToDownload;
  }

  /**
   * Downloads and extracts a package file from a component URL.
   *
   * @param componentUrl - The URL of the component.
   * @returns The path to the extracted file and the last modification timestamp.
   * @throws Will throw an error if no valid compression method is found.
   */
  private async downloadAndExtractIndexArchive(
    indexUrl: string,
  ): Promise<{ extractedFile: string; lastTimestamp: Date }> {
    const indexUrlHash = toSha256(indexUrl);
    const fullCacheDir = await fs.ensureCacheDir(cacheSubDir);
    const extractedFile = upath.join(fullCacheDir, `${indexUrlHash}.txt`);
    let lastTimestamp_utc = await packageCache.get(
      `datasource-${AlpineDatasource.id}`,
      indexUrl + '-timestamp',
    );
    if (lastTimestamp_utc == undefined) {
      lastTimestamp_utc = new Date().toUTCString();
    }

    let lastTimestamp = new Date(lastTimestamp_utc);

    const compression = 'tar.gz';
    const compressedFile = upath.join(
      fullCacheDir,
      `${nanoid()}_${indexUrlHash}.${compression}`,
    );

    const dateNowUtc = new Date();
    const wasUpdated = await this.downloadIndexFile(
      indexUrl,
      compression,
      compressedFile,
      lastTimestamp,
    );

    if (wasUpdated || !lastTimestamp) {
      packageCache.set(
        `datasource-${AlpineDatasource.id}`,
        indexUrl + '-timestamp',
        dateNowUtc.toUTCString(),
        24 * 60,
      );
      try {
        await extract(compressedFile, compression, extractedFile);
        lastTimestamp = dateNowUtc;
      } catch (error) {
        logger.warn(
          {
            compressedFile,
            indexUrl,
            compression,
            error: error.message,
          },
          'Failed to extract package file from compressed file',
        );
      } finally {
        await fs.rmCache(compressedFile);
      }
    }

    if (!lastTimestamp) {
      //extracting went wrong
      throw new Error('Missing metadata in extracted package index file!');
    }

    return { extractedFile, lastTimestamp };
  }

  @cache({
    namespace: `datasource-${AlpineDatasource.id}`,
    key: (indexUrl: string) => indexUrl,
  })
  async getPackageIndex(
    indexUrl: string,
  ): Promise<Record<string, PackageDescription[]>> {
    const { extractedFile, lastTimestamp } =
      await this.downloadAndExtractIndexArchive(indexUrl);
    return await this.parseExtractedPackageIndex(extractedFile, lastTimestamp);
  }

  /**
   * Fetches the release information for a given package from the registry URL.
   *
   * @param config - Configuration for fetching releases.
   * @returns The release result if the package is found, otherwise null.
   */
  @cache({
    namespace: `datasource-${AlpineDatasource.id}`,
    key: ({ registryUrl, packageName }: GetReleasesConfig) =>
      `${registryUrl}:${packageName}`,
  })
  async getReleases({
    registryUrl,
    packageName,
  }: GetReleasesConfig): Promise<ReleaseResult | null> {
    if (!registryUrl) {
      return null;
    }

    let aggregatedRelease: ReleaseResult | null = null;

    try {
      const packageIndex = await this.getPackageIndex(registryUrl);
      const parsedPackages = packageIndex[packageName];

      if (parsedPackages) {
        aggregatedRelease = formatReleaseResult(parsedPackages);
      }
    } catch (error) {
      //logger.debug({ indexUrl, error }, 'Skipping component due to an error');
      logger.debug({ error }, 'Skipping component due to an error');
    }

    return aggregatedRelease;
  }
}
