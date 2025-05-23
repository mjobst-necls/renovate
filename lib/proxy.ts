import is from '@sindresorhus/is';
import { createGlobalProxyAgent } from 'global-agent';
import { logger } from './logger';

const envVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY'];

let agent = false;

export function bootstrap(): void {
  envVars.forEach((envVar) => {
    /* v8 ignore start -- env is case-insensitive on windows */
    if (
      typeof process.env[envVar] === 'undefined' &&
      typeof process.env[envVar.toLowerCase()] !== 'undefined'
    ) {
      process.env[envVar] = process.env[envVar.toLowerCase()];
    }
    /* v8 ignore stop */

    if (process.env[envVar]) {
      logger.debug(`Detected ${envVar} value in env`);
      process.env[envVar.toLowerCase()] = process.env[envVar];
    }
  });

  if (
    is.nonEmptyString(process.env.HTTP_PROXY) ||
    is.nonEmptyString(process.env.HTTPS_PROXY)
  ) {
    createGlobalProxyAgent({
      environmentVariableNamespace: '',
    });
    agent = true;
  } else {
    // for testing only, does not reset global agent
    agent = false;
  }
}

// will be used by our http layer later
export function hasProxy(): boolean {
  return agent === true;
}
