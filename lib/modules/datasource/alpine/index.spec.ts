import type { DirectoryResult } from 'tmp-promise';
import { dir } from 'tmp-promise';
import { getPkgReleases } from '..';
import { Fixtures } from '../../../../test/fixtures';
import * as httpMock from '../../../../test/http-mock';
import { GlobalConfig } from '../../../config/global';
import { joinUrlParts } from '../../../util/url';
import type { GetPkgReleasesConfig } from '../types';

//https://dl-cdn.alpinelinux.org/alpine/v3.21/main/aarch64/APKINDEX.tar.gz
const debBaseUrl = 'https://dl-cdn.alpinelinux.org';

describe('modules/datasource/alpine/index', () => {
  const fixtureMainApkIndexArchive = Fixtures.getPath(`main/APKINDEX.tar.gz`);
  //const fixtureCommunityApkIndexArchive = Fixtures.getPath(`community/APKINDEX.tar.gz`);
  //const fixturePackagesPath = Fixtures.getPath(`main/APKINDEX`);

  let cacheDir: DirectoryResult | null;
  let cfg: GetPkgReleasesConfig;

  beforeEach(async () => {
    jest.resetAllMocks();
    cacheDir = await dir({ unsafeCleanup: true });
    GlobalConfig.set({ cacheDir: cacheDir.path });

    cfg = {
      datasource: 'alpine',
      packageName: '7zip',
      registryUrls: [joinUrlParts(debBaseUrl, 'v3.21', 'main', 'x86_64')],
    };
  });

  afterEach(async () => {
    await cacheDir?.cleanup();
    cacheDir = null;
  });

  describe('getReleases', () => {
    it('returns a valid version for the package `7zip`', async () => {
      httpMock
        .scope(debBaseUrl)
        .get(
          '/' + joinUrlParts('', 'v3.21', 'main', 'x86_64', 'APKINDEX.tar.gz'),
        )
        .replyWithFile(200, fixtureMainApkIndexArchive);

      const res = await getPkgReleases(cfg);
      expect(res).toEqual({
        homepage: 'https://7-zip.org/',
        registryUrl: 'https://dl-cdn.alpinelinux.org/v3.21/main/x86_64',
        releases: [
          {
            version: '24.08-r0',
          },
        ],
      });

      httpMock
        .scope(debBaseUrl)
        .head(
          '/' + joinUrlParts('', 'v3.21', 'main', 'x86_64', 'APKINDEX.tar.gz'),
        )
        .reply(304);

      const res2 = await getPkgReleases(cfg);
      expect(res2).toEqual({
        homepage: 'https://7-zip.org/',
        registryUrl: 'https://dl-cdn.alpinelinux.org/v3.21/main/x86_64',
        releases: [
          {
            version: '24.08-r0',
          },
        ],
      });
    });
  });
});
