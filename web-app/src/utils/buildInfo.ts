import pkg from '../../package.json';

export const BUILD_INFO = {
  name: pkg.name,
  version: pkg.version,
} as const;

