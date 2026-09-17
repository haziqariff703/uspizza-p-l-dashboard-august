import { getSupabaseClient } from './supabase'

/** The only source values `outlet_aliases.source` accepts. */
export const ALIAS_SOURCES = ['pos', 'grab', 'foodpanda', 'shopee', 'apps'] as const
export type AliasSource = (typeof ALIAS_SOURCES)[number]

export interface DirectoryOutlet {
  id: string
  name: string
  code: string | null
  entity: string | null
}

/** Canonical outlets and their source aliases, exactly as the database holds them. */
export interface OutletDirectory {
  outlets: DirectoryOutlet[]
  /** `source:alias` (both lowercased) → outlet id. */
  aliases: Record<string, string>
}

export const EMPTY_DIRECTORY: OutletDirectory = { outlets: [], aliases: {} }

/** Alias matching is case- and whitespace-insensitive; nothing else is normalized. */
export const directoryKey = (source: string, alias: string) =>
  `${source.trim().toLowerCase()}:${alias.trim().toLowerCase().replace(/\s+/g, ' ')}`

/** A source name resolves only through a recorded alias. Nothing is guessed. */
export const resolveAlias = (directory: OutletDirectory, source: string, name: string): DirectoryOutlet | undefined => {
  const id = directory.aliases[directoryKey(source, name)]
  return id ? directory.outlets.find(outlet => outlet.id === id) : undefined
}

export async function loadOutletDirectory(): Promise<OutletDirectory> {
  const supabase = getSupabaseClient()
  const [outlets, aliases] = await Promise.all([
    supabase.from('outlets').select('id, name, code, entity').order('name', { ascending: true }),
    supabase.from('outlet_aliases').select('outlet_id, source, alias'),
  ])
  if (outlets.error) throw outlets.error
  if (aliases.error) throw aliases.error
  return {
    outlets: (outlets.data ?? []) as DirectoryOutlet[],
    aliases: Object.fromEntries(
      ((aliases.data ?? []) as Array<{ outlet_id: string; source: string; alias: string }>)
        .map(row => [directoryKey(row.source, row.alias), row.outlet_id]),
    ),
  }
}
