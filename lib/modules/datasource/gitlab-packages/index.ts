import { cache } from '../../../util/cache/package/decorator';
import { GitlabHttp } from '../../../util/http/gitlab';
import { asTimestamp } from '../../../util/timestamp';
import { joinUrlParts } from '../../../util/url';
import { Datasource } from '../datasource';
import type { GetReleasesConfig, ReleaseResult } from '../types';
import { datasource } from './common';
import type { GitlabPackage } from './types';

// Gitlab Packages API: https://docs.gitlab.com/ee/api/packages.html

export class GitlabPackagesDatasource extends Datasource {
  static readonly id = datasource;

  protected override http: GitlabHttp;

  override caching = true;

  override customRegistrySupport = true;

  override defaultRegistryUrls = ['https://gitlab.com'];

  override readonly releaseTimestampSupport = true;
  override readonly releaseTimestampNote =
    'The release timestamp is determined from the `created_at` field in the results.';

  constructor() {
    super(datasource);
    this.http = new GitlabHttp(datasource);
  }

  static getGitlabPackageApiUrl(
    registryUrl: string,
    projectName: string,
    packageName: string,
  ): string {
    const projectNameEncoded = encodeURIComponent(projectName);
    const packageNameEncoded = encodeURIComponent(packageName);

    return joinUrlParts(
      registryUrl,
      `api/v4/projects`,
      projectNameEncoded,
      `packages?package_name=${packageNameEncoded}&per_page=100`,
    );
  }

  @cache({
    namespace: `datasource-${datasource}`,
    key: ({ registryUrl, packageName }: GetReleasesConfig) =>
      // TODO: types (#22198)
      `${registryUrl}-${packageName}`,
  })
  async getReleases({
    registryUrl,
    packageName,
  }: GetReleasesConfig): Promise<ReleaseResult | null> {
    /* v8 ignore next 3 -- should never happen */
    if (!registryUrl) {
      return null;
    }

    const [projectPart, packagePart] = packageName.split(':', 2);

    const apiUrl = GitlabPackagesDatasource.getGitlabPackageApiUrl(
      registryUrl,
      projectPart,
      packagePart,
    );

    const result: ReleaseResult = {
      releases: [],
    };

    let response: GitlabPackage[];
    try {
      response = (
        await this.http.getJsonUnchecked<GitlabPackage[]>(apiUrl, {
          paginate: true,
        })
      ).body;

      result.releases = response
        // Setting the package_name option when calling the GitLab API isn't enough to filter information about other packages
        // because this option is only implemented on GitLab > 12.9 and it only does a fuzzy search.
        .filter((r) => (r.conan_package_name ?? r.name) === packagePart)
        .map(({ version, created_at }) => ({
          version,
          releaseTimestamp: asTimestamp(created_at),
        }));
    } catch (err) {
      this.handleGenericErrors(err);
    }

    return result.releases?.length ? result : null;
  }
}
