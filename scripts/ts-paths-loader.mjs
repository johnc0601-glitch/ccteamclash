import {existsSync, statSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

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
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

export async function resolve(specifier, context, nextResolve) {
  const aliasPath = resolveAlias(specifier);
  if (aliasPath) {
    return nextResolve(pathToFileURL(aliasPath).href, context);
  }

  if (specifier.startsWith('.') && context.parentURL) {
    const candidates = [
      new URL(`${specifier}.ts`, context.parentURL),
      new URL(`${specifier}.tsx`, context.parentURL),
      new URL(`${specifier}/index.ts`, context.parentURL),
      new URL(`${specifier}/index.tsx`, context.parentURL),
    ];
    const candidate = candidates.find((url) => {
      try {
        return statSync(url).isFile();
      } catch {
        return false;
      }
    });
    if (candidate) return {url: candidate.href, shortCircuit: true};
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const source = await readFile(new URL(url), 'utf8');
    return {
      format: 'module',
      shortCircuit: true,
      source: ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
    };
  }
  return nextLoad(url, context);
}
