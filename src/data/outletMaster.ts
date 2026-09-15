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

// Only typography is automatic. Location abbreviations require an explicit alias.
export const outletNameKey = (name: string) => name.trim().toLowerCase()
  .replace(/^us\s+pizza\b\s*[-–—(]?\s*/, '')
  .replace(/[’']/g, '').replace(/[().,]/g, '').replace(/\s+/g, ' ').trim()
export const aliasKey = (source: string, name: string) => `${source}:${outletNameKey(name)}`
export function resolveOutlet(source: string, name: string, mappings: OutletMappings = EMPTY_MAPPINGS) {
  if (!/^us\s+pizza\b/i.test(name.trim())) return undefined
  const master = [...OUTLET_MASTER, ...mappings.outlets]
  const alias = mappings.aliases[aliasKey(source, name)]
  if (alias) return master.find(o => o.id === alias)
  const matches = master.filter(o => outletNameKey(o.name) === outletNameKey(name))
  return matches.length === 1 ? matches[0] : undefined
}

export function parseMappings(raw: string | null): OutletMappings {
  if (!raw) return EMPTY_MAPPINGS
  const data = JSON.parse(raw)
  if (!Array.isArray(data.outlets) || !data.aliases || typeof data.aliases !== 'object' || Array.isArray(data.aliases)
    || !data.outlets.every((o: CanonicalOutlet) => o && typeof o.id === 'string' && typeof o.name === 'string' && Object.values(ENTITY_NAMES).some(entity => entity === o.entity))
    || !Object.values(data.aliases).every(id => typeof id === 'string')) throw new Error('Invalid outlet mappings')
  return data
}
