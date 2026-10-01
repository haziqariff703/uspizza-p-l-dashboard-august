/**
 * Bundles the Sections 4–6 chart island into
 * `US-Pizza-August-2026-Dashboard.html`, replacing the purchase CSS bar lists
 * and wiring the Recharts mounts.
 *
 *   node --import tsx scripts/build_section4_august_dataset.mts   # first
 *   node --import tsx scripts/build_section4_island.mts
 *
 * The bundle is inlined, so the file keeps opening offline with no CDN or server.
 * Idempotent: running it again re-patches the already-patched file.
 */
import fs from 'node:fs'
import path from 'node:path'
import esbuild from 'esbuild'

const ROOT = path.resolve(import.meta.dirname, '..')
const HTML = path.join(ROOT, 'US-Pizza-August-2026-Dashboard.html')
const DATASET = path.join(ROOT, '.s4tmp', 'section4-august-dataset.json')
const ISLAND = path.join(ROOT, 'scripts', 'section4-chart-island.tsx')

const MOUNT_ID = 's4chart'
const DATA_ID = 'S4_DATA'
const BUNDLE_ID = 'S4_ISLAND'

/** Card shell, heading and period label copied from the fragment being replaced. */
const SECTION4_FRAGMENT = '<div class="relative space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">'
  + '<div class="flex items-center gap-2.5">'
  + '<span class="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs">4</span>'
  + '<div><h2 class="text-lg font-extrabold tracking-tight text-slate-900">Sales by Outlet</h2>'
  + '<p class="text-xs text-slate-500">Imported sales · August 2026</p></div></div>'
  + `<div id="${MOUNT_ID}"></div></div>`

// --- bundle ------------------------------------------------------------------

const built = await esbuild.build({
  entryPoints: [ISLAND],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  write: false,
  absWorkingDir: ROOT,
})
const code = built.outputFiles[0].text
process.stderr.write(`island bundle: ${(code.length / 1024).toFixed(0)} KB minified\n`)

// --- patch -------------------------------------------------------------------

/** The file is CRLF throughout; markers are written LF so they are normalised here
 *  and restored on write, leaving the rest of the file's line endings untouched. */
let html = fs.readFileSync(HTML, 'utf8').replace(/\r\n/g, '\n')

// Drop anything a previous run added, so the patch is not applied twice.
html = html.replace(new RegExp(`<script id="${DATA_ID}"[\\s\\S]*?</script>\\n?`), '')
  .replace(new RegExp(`<script id="${BUNDLE_ID}">[\\s\\S]*?</script>\\n?`), '')

const dataset = JSON.parse(fs.readFileSync(DATASET, 'utf8'))

// 1. One shared Section 4 fragment across all three entity scopes.
const marker = '<script id="SSR_DATA" type="application/json">'
const start = html.indexOf(marker) + marker.length
const end = html.indexOf('</script>', start)
const bundleData = JSON.parse(html.slice(start, end))
for (const scope of ['all', 'myUsPizza', 'sabah']) {
  if (!bundleData[scope]?.salesByOutlet) throw new Error(`No salesByOutlet fragment for ${scope}`)
  bundleData[scope].salesByOutlet = SECTION4_FRAGMENT
  for (const [section, mount] of [['purchasesByOutlet', 's5chart'], ['purchasesToNetSales', 's6chart']] as const) {
    const fragment: string = bundleData[scope][section]
    if (!fragment) throw new Error(`No ${section} fragment for ${scope}`)
    if (fragment.includes(`id="${mount}"`)) continue
    const list = /<div class="rounded-xl border border-slate-200 bg-slate-50\/40 p-3 sm:p-4"><ol class="space-y-2">[\s\S]*?<\/ol><\/div>/
    if (!list.test(fragment)) throw new Error(`No chart list for ${scope}/${section}`)
    bundleData[scope][section] = fragment.replace(list, `<div id="${mount}"></div>`)
      .replace(/<p class="text-center text-\[11px\] text-slate-400">\d+ of \d+ corporate outlets, ranked high → low<\/p>/, '')
  }
}

// 1b. Section 3's coverage matrix and Full Matrix View read the same __matrix.
// A channel Section 4's own source data reports for an outlet — resolved through
// OUTLET_NAME_MAP aliases the snapshot's original build did not have — is real
// coverage, so it is synced here rather than left showing "Unavailable" in the
// other two views for the same outlet.
const matrixById = new Map(bundleData.__matrix.map((outlet: { id: string }) => [outlet.id, outlet]))
let coverageUpdates = 0
for (const outlet of dataset.outlets as Array<{ id: string; name: string; channels: Record<string, { status: string }> }>) {
  const matrixOutlet = matrixById.get(outlet.id) as Record<string, string> | undefined
  if (!matrixOutlet) continue
  for (const channel of dataset.sourcedChannels as string[]) {
    if (outlet.channels[channel].status === 'reported' && matrixOutlet[channel] !== 'imported') {
      matrixOutlet[channel] = 'imported'
      coverageUpdates++
      process.stderr.write(`coverage matrix: ${outlet.name} ${channel} -> imported\n`)
    }
  }
}
process.stderr.write(`coverage matrix: ${coverageUpdates} channel flag(s) updated from Section 4 source data\n`)
/** JSON safe to sit inside a <script> element. Only the two sequences that can end
 *  or comment out the element are escaped — the SSR fragments are mostly markup, so
 *  escaping every `<` would multiply the file size. Both forms re-parse identically. */
const inlineJson = (value: unknown) => JSON.stringify(value)
  .replace(/<\//g, '<\\/')
  .replace(/<!--/g, '<\\u0021--')
html = html.slice(0, start) + inlineJson(bundleData) + html.slice(end)

// 2. The aggregate payload and the bundle, both before the shell script that calls render().
const shellScript = '<script>/* Standalone interaction layer over server-rendered real components. */'
if (!html.includes(shellScript)) throw new Error('Shell script marker not found')
// A replacer *function*, never a replacement string: the minified bundle contains
// `$&` and `$'` sequences, which String.replace would expand into the whole file.
const injected = [
  `<script id="${DATA_ID}" type="application/json">${inlineJson(dataset)}</script>`,
  `<script id="${BUNDLE_ID}">${code.replace(/<\/script/gi, '<\\/script')}</script>`,
  shellScript,
].join('\n')
html = html.replace(shellScript, () => injected)

// 3. Shell state, so the metric and view survive a scope or section change.
const insertOnce = (marker: string, replacement: string, evidence: string) => {
  if (html.includes(evidence)) return
  if (!html.includes(marker)) throw new Error(`Shell marker not found: ${marker.trim()}`)
  html = html.replace(marker, () => replacement)
}

const stateLine = "mFilter: 'all', feePlatform: 'all' };"
insertOnce(stateLine, "mFilter: 'all', feePlatform: 'all', s4Metric: 'net', s4View: 'total' };", 's4Metric:')

// 4. Unmount the React root before any innerHTML replacement, and mount after Section 4.
const unmountCall = '  if (window.__s4unmount) window.__s4unmount();'
insertOnce('function render() {\n', `function render() {\n${unmountCall}\n`, unmountCall)

const coverageLine = "  if (S.section === 'coverage') bindCoverage();"
const mountCall = `  if (S.section === 'salesByOutlet') window.__s4mount(views.querySelector('#${MOUNT_ID}'), S.scope, S);`
insertOnce(coverageLine, `${coverageLine}\n${mountCall}`, mountCall)
const purchaseMount = "  if (S.section === 'purchasesByOutlet' || S.section === 'purchasesToNetSales') window.__s56mount(views.querySelector(S.section === 'purchasesByOutlet' ? '#s5chart' : '#s6chart'), S.scope, S.section, S);"
insertOnce(mountCall, `${mountCall}\n${purchaseMount}`, purchaseMount)

fs.writeFileSync(HTML, html.replace(/\n/g, '\r\n'))
process.stderr.write(`patched ${path.relative(ROOT, HTML)} — ${(html.length / 1024 / 1024).toFixed(2)} MB\n`)

// --- utility class check -----------------------------------------------------
// The standalone file ships a pre-compiled Tailwind stylesheet; a class the
// island uses that the sheet never emitted would silently do nothing.
const css = html.slice(0, html.indexOf('</head>'))
const source = fs.readFileSync(ISLAND, 'utf8')
const tokens = new Set<string>()
for (const [, list] of source.matchAll(/className=(?:"([^"]+)"|\{`([^`]+)`\})/g)) {
  for (const token of (list ?? '').split(/\s+/)) if (token && !token.includes('$')) tokens.add(token)
}
for (const [, list] of source.matchAll(/(?:ON|OFF)\s*=\s*'([^']+)'/g)) {
  for (const token of list.split(/\s+/)) if (token) tokens.add(token)
}
const escapeClass = (token: string) => token.replace(/[.:[\]()/%#!,'"+*~^$&|{}]/g, ch => `\\${ch}`)
const missing = [...tokens].filter(token => !css.includes(`.${escapeClass(token)}`))
process.stderr.write(missing.length
  ? `\nUtility classes not present in the compiled stylesheet (${missing.length}):\n  ${missing.join('\n  ')}\n`
  : '\nAll island utility classes exist in the compiled stylesheet.\n')
