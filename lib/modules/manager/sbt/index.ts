import type { Category } from '../../../constants';
import { GithubReleasesDatasource } from '../../datasource/github-releases';
import { MavenDatasource } from '../../datasource/maven';
import { SbtPackageDatasource } from '../../datasource/sbt-package';
import { SbtPluginDatasource } from '../../datasource/sbt-plugin';
import * as ivyVersioning from '../../versioning/ivy';

export { extractAllPackageFiles, extractPackageFile } from './extract';
export { bumpPackageVersion } from './update';

export const displayName = 'sbt';
export const url = 'https://www.scala-sbt.org';
export const categories: Category[] = ['java'];

export const defaultConfig = {
  managerFilePatterns: [
    '/\\.sbt$/',
    '/project/[^/]*\\.scala$/',
    '/project/build\\.properties$/',
    '/(^|/)repositories$/',
  ],
  versioning: ivyVersioning.id,
};

export const supportedDatasources = [
  MavenDatasource.id,
  SbtPackageDatasource.id,
  SbtPluginDatasource.id,
  GithubReleasesDatasource.id, // For sbt itself
];
