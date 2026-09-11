// Test-only TypeScript loader uses the compiler already installed by this project.
import ts from 'typescript'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const sourceRoot = new URL('../src/', import.meta.url)
export async function resolve(specifier, context, nextResolve) {
  const candidate = specifier.startsWith('@/') ? new URL(specifier.slice(2), sourceRoot)
    : specifier.startsWith('.') && context.parentURL ? new URL(specifier, context.parentURL) : null
  if (candidate?.protocol === 'file:') {
    const path = fileURLToPath(candidate)
    for (const suffix of ['', '.ts', '.tsx', '/index.ts']) {
      if (existsSync(path + suffix) && /\.(ts|tsx)$/.test(path + suffix)) return { url: pathToFileURL(path + suffix).href, shortCircuit: true }
    }
  }
  return nextResolve(specifier, context)
}
export async function load(url, context, nextLoad) {
  if (/\.(ts|tsx)$/.test(url)) {
    const source = await readFile(new URL(url), 'utf8')
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX }, fileName: fileURLToPath(url) })
    return { format: 'module', source: output.outputText, shortCircuit: true }
  }
  return nextLoad(url, context)
}
