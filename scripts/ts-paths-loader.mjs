import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

function resolveAlias(specifier) {
  if (!specifier.startsWith('@/')) return undefined;

  const withoutAlias = specifier.slice(2);
  const candidates = [
    `./src/${withoutAlias}`,
    `./src/${withoutAlias}.ts`,
    `./src/${withoutAlias}.tsx`,
    `./src/${withoutAlias}/index.ts`,
    `./src/${withoutAlias}/index.tsx`,
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

export async function resolve(specifier, context, nextResolve) {
  const aliasPath = resolveAlias(specifier);
  if (aliasPath) {
    return nextResolve(pathToFileURL(aliasPath).href, context);
  }

  return nextResolve(specifier, context);
}
