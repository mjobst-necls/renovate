import type { Category } from '../../../constants';
import { DockerDatasource } from '../../datasource/docker';
import { GitTagsDatasource } from '../../datasource/git-tags';
import { HelmDatasource } from '../../datasource/helm';

export { extractPackageFile } from './extract';

export const displayName = 'Rancher Fleet';
export const url = 'https://fleet.rancher.io';
export const categories: Category[] = ['cd', 'kubernetes'];

export const defaultConfig = {
  managerFilePatterns: ['/(^|/)fleet\\.ya?ml/'],
};

export const supportedDatasources = [
  GitTagsDatasource.id,
  HelmDatasource.id,
  DockerDatasource.id,
];
