import { PL_BY_OUTLET } from './outletData'
import type { DirectoryOutlet } from '../lib/outletDirectory'

// Identity only: never copy May's financial values into imported months.
export function liveOutletRoster(directory: DirectoryOutlet[]): DirectoryOutlet[] {
  const master = [...PL_BY_OUTLET, { code: 'MY-051', name: 'Taman Connaught', entity: 'MY US PIZZA' }, { code: 'MY-081', name: 'Kota Damansara', entity: 'MY US PIZZA' }]
  return master.map(outlet => directory.find(row => row.code === outlet.code && !row.name.includes('duplicate'))
    ?? { id: `missing-master:${outlet.code}`, code: outlet.code, name: outlet.name, entity: outlet.entity })
}
