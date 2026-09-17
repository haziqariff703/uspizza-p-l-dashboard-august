import { ORIGINAL_OUTLETS } from './originalOutlets'
import { INITIAL_OUTLETS } from './outletData'
import { ENTITY_NAMES } from './aggregate'

export interface CanonicalOutlet { id: string; name: string; entity: string }
export interface OutletMappings {
  outlets: CanonicalOutlet[]
  aliases: Record<string, string>
}
export const EMPTY_MAPPINGS: OutletMappings = { outlets: [], aliases: {} }
export const OUTLET_MASTER: CanonicalOutlet[] = [
  ...ORIGINAL_OUTLETS.map(o => ({ id: o.code, name: o.name, entity: o.entity })),
  ...INITIAL_OUTLETS.filter(o => o.status === 'upcoming').map(o => ({
    id: o.code, name: o.name, entity: o.entity === 'Sabah' ? ENTITY_NAMES.sabah : ENTITY_NAMES.myUsPizza,
  })),
]

// Sister brands share our locations but not our sales, so they are rejected by
// name. This is a denylist, not a "must be branded US Pizza" gate: a source name
// we do not recognise stays visible as unmapped instead of being dropped.
// Extend this list when another sister brand appears in a source export.
const SISTER_BRANDS = [/manhattan\s+fish\s+market/i]
export const isSisterBrand = (name: string) => SISTER_BRANDS.some(brand => brand.test(name))

// Only typography is automatic. Location abbreviations require an explicit alias.
export const outletNameKey = (name: string) => name.trim().toLowerCase()
  .replace(/^us\s+pizza\b\s*[-–—(]?\s*/, '')
  .replace(/[’']/g, '').replace(/[().,]/g, '').replace(/\s+/g, ' ').trim()
// An operating-company prefix ("Marshall's Co - Greenlane") is dropped only as a
// fallback, and only when what remains names exactly one master outlet.
const afterOperatorPrefix = (key: string) => key.match(/^.+?\s[-–—]\s(.+)$/)?.[1].trim()
export const aliasKey = (source: string, name: string) => `${source}:${outletNameKey(name)}`
export function resolveOutlet(source: string, name: string, mappings: OutletMappings = EMPTY_MAPPINGS) {
  if (isSisterBrand(name)) return undefined
  const master = [...OUTLET_MASTER, ...mappings.outlets]
  const alias = mappings.aliases[aliasKey(source, name)]
  if (alias) return master.find(o => o.id === alias)
  const unique = (key: string | undefined) => {
    const matches = key ? master.filter(o => outletNameKey(o.name) === key) : []
    return matches.length === 1 ? matches[0] : undefined
  }
  const key = outletNameKey(name)
  return unique(key) ?? unique(afterOperatorPrefix(key))
}

export function parseMappings(raw: string | null): OutletMappings {
  if (!raw) return EMPTY_MAPPINGS
  const data = JSON.parse(raw)
  if (!Array.isArray(data.outlets) || !data.aliases || typeof data.aliases !== 'object' || Array.isArray(data.aliases)
    || !data.outlets.every((o: CanonicalOutlet) => o && typeof o.id === 'string' && typeof o.name === 'string' && Object.values(ENTITY_NAMES).some(entity => entity === o.entity))
    || !Object.values(data.aliases).every(id => typeof id === 'string')) throw new Error('Invalid outlet mappings')
  return data
}
