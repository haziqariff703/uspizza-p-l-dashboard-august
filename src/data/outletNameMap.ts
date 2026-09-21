import type { AliasSource } from '../lib/outletDirectory'

/**
 * Hardcoded outlet name table, transcribed from the real August 2026 exports in
 * `datasource/`. This is the curated seed the matcher trusts before it tries any
 * similarity scoring: a name in here is that outlet, full stop.
 *
 * Scope is deliberately closed. Only the 46 HQ-owned outlets exist here — the 44
 * trading outlets from Section 7's May P&L master plus Taman Connaught and Kota
 * Damansara, which were pre-opening in May and have since opened. Every other
 * name a source file carries is not ours and is listed in NON_HQ_SOURCE_NAMES
 * below, so it is excluded once rather than reviewed monthly.
 *
 * Codes come from PL_BY_OUTLET / ORIGINAL_OUTLETS, which agree on all 44 May
 * outlets; the two later openings are listed in PL_MASTER's OPENED_SINCE_PL.
 * Finance owns this file: adding an outlet here makes its sales count.
 */
export interface HardcodedOutlet {
  code: string
  name: string
  /** Exact spellings seen per source. Matching is case- and punctuation-insensitive. */
  sources: Partial<Record<AliasSource, string[]>>
}

export const OUTLET_NAME_MAP: HardcodedOutlet[] = [
  {
    code: 'MY-030', name: 'Dpulze Cyberjaya',
    sources: {
      pos: ['US Pizza Dpulze Shopping Centre'],
      grab: ['US Pizza - Dpulze Cyberjaya Mall'],
      foodpanda: ['US Pizza (Dpulze Cyberjaya Mall)'],
      shopee: ['US Pizza - D\'Pulze'],
      apps: ['US Pizza- Dpulze Cyberjaya'],
    },
  },
  {
    code: 'MY-076', name: 'Vivacity Kuching',
    sources: {
      pos: ['US Pizza Kuching Viva City'],
      foodpanda: ['US Pizza (Vivacity)'],
      shopee: ['US Pizza - Vivacity Kuching'],
      apps: ['US Pizza - Vivacity'],
    },
  },
  {
    code: 'MY-015', name: 'Mount Austin',
    sources: {
      pos: ['US Pizza Austin'],
      grab: ['US Pizza - Mount Austin'],
      foodpanda: ['US Pizza (Mount Austin JB)'],
      shopee: ['US Pizza - Mount Austin'],
      apps: ['US PIZZA - Mount Austin Johor'],
    },
  },
  {
    code: 'MY-007', name: 'Dang Wangi',
    sources: {
      pos: ['US Pizza Dang Wangi'],
      grab: ['US Pizza - Jalan Dang Wangi KL'],
      foodpanda: ['US PIZZA DANG WANGI'],
      shopee: ['US Pizza - Dang Wangi KL'],
      apps: ['US PIZZA - Dang Wangi'],
    },
  },
  {
    code: 'MY-020', name: 'Greenlane',
    sources: {
      pos: ['US Pizza Greenlane'],
      grab: ['US Pizza - Greenlane'],
      foodpanda: ['US Pizza (Greenlane)'],
      shopee: ['US Pizza - Greenlane'],
      apps: ['US PIZZA - Greenlane Outlet'],
    },
  },
  {
    code: 'MY-028', name: 'Sri Petaling',
    sources: {
      pos: ['US Pizza Sri Petaling'],
      grab: ['Us Pizza - Sri Petaling'],
      foodpanda: ['US Pizza (Sri Petaling)'],
      shopee: ['US Pizza - Sri Petaling'],
      apps: ['US PIZZA - Sri Petaling'],
    },
  },
  {
    code: 'MY-026', name: 'ST Rosyam Mall Klang',
    sources: {
      pos: ['US Pizza ST Rosyam Mall Klang'],
      grab: ['US Pizza - St Rosyam Klang'],
      foodpanda: ['US Pizza (ST Rosyam)'],
      shopee: ['US Pizza - Rosyam Mall Klang'],
      apps: ['ST Rosyam Mall Klang'],
    },
  },
  {
    code: 'MY-037', name: 'Lotus Seberang Jaya',
    sources: {
      pos: ['US Pizza Lotus Seberang Jaya'],
      grab: ['US Pizza - Lotus Seberang Jaya'],
      foodpanda: ['US Pizza (Lotus Seberang Jaya)'],
      shopee: ['US Pizza - Lotus Seberang Jaya'],
      apps: ['US PIZZA - Lotus Seberang Jaya'],
    },
  },
  {
    code: 'MY-021', name: 'Summerton',
    sources: {
      pos: ['US Pizza Summerton'],
      grab: ['US Pizza - Summerton Bayan Lepas'],
      shopee: ['US Pizza - Summerton'],
      apps: ['US PIZZA - Summerton Outlet'],
    },
  },
  {
    code: 'MY-078', name: 'Lucerne Residence Penang',
    sources: {
      pos: ['US Pizza Lucernce Square, Penang'],
      shopee: ['US Pizza - Lucerne Square Penang'],
      apps: ['US Pizza - Lucerne Penang'],
    },
  },
  {
    code: 'MY-013', name: 'Senawang',
    sources: {
      pos: ['US Pizza Senawang'],
      grab: ['US Pizza - Senawang'],
      foodpanda: ['US PIZZA (Senawang)'],
      shopee: ['US Pizza - Senawang'],
      apps: ['US Pizza - Senawang'],
    },
  },
  {
    code: 'MY-009', name: 'Kota Warisan',
    sources: {
      pos: ['US Pizza Kota Warisan'],
      grab: ['Us Pizza - Kota Warisan Sepang'],
      foodpanda: ['US PIZZA (Sepang)'],
      shopee: ['US Pizza - Sepang'],
      apps: ['US Pizza - Sepang'],
    },
  },
  {
    code: 'MY-008', name: 'Pandan Indah',
    sources: {
      pos: ['US Pizza Pandan Indah'],
      grab: ['US Pizza - Pandan Indah'],
      foodpanda: ['US Pizza (Pandan Indah)'],
      shopee: ['US Pizza - Pandan Indah'],
      apps: ['US Pizza - Pandan Indah'],
    },
  },
  {
    code: 'MY-036', name: 'Puchong Jaya',
    sources: {
      pos: ['US Pizza Puchong Jaya'],
      grab: ['US Pizza - Puchong Jaya'],
      foodpanda: ['US Pizza (Puchong Jaya)'],
      shopee: ['US Pizza - Puchong Jaya'],
      apps: ['US PIZZA - Puchong Jaya'],
    },
  },
  {
    code: 'MY-002', name: 'Ampang',
    sources: {
      pos: ['US Pizza Ampang'],
      grab: ['US Pizza - Jalan Ampang'],
      foodpanda: ['US Pizza (Jalan Ampang)'],
      shopee: ['US Pizza - Jln Ampang'],
      apps: ['US PIZZA - Jalan Ampang'],
    },
  },
  {
    code: 'MY-005', name: 'SS2',
    sources: {
      pos: ['US Pizza SS2'],
      grab: ['US Pizza - SS2'],
      foodpanda: ['US Pizza (SS2)'],
      shopee: ['US Pizza - SS2'],
      apps: ['US PIZZA - SS2'],
    },
  },
  {
    code: 'MY-003', name: 'Seri Kembangan',
    sources: {
      pos: ['US Pizza Seri Kembangan'],
      grab: ['US Pizza - Seri Kembangan'],
      foodpanda: ['US PIZZA SRI KEMBANGAN'],
      shopee: ['US Pizza - Seri Kembangan'],
      apps: ['US Pizza - Seri Kembangan'],
    },
  },
  {
    code: 'MY-004', name: 'SS15',
    sources: {
      pos: ['US Pizza SS15'],
      foodpanda: ['US Pizza (SS15)'],
      shopee: ['US Pizza - SS15'],
      apps: ['US PIZZA - SS15'],
    },
  },
  {
    code: 'MY-017', name: 'Taman Universiti',
    sources: {
      pos: ['US Pizza Taman Universiti'],
      grab: ['US Pizza - Taman Universiti'],
      foodpanda: ['US PIZZA TAMAN UNIVERSITI'],
      shopee: ['US Pizza - Taman Universiti'],
    },
  },
  {
    code: 'MY-040', name: 'Kiara Bay',
    sources: {
      pos: ['US Pizza Kiara Bay'],
      grab: ['US Pizza - Kiara Bay Kepong'],
      foodpanda: ['US Pizza  (Kiara Bay)'],
      shopee: ['US Pizza - Kiara Bay'],
      apps: ['US PIZZA - Kiara Bay'],
    },
  },
  {
    code: 'MY-027', name: 'Sungai Petani',
    sources: {
      pos: ['US Pizza Sungai Petani'],
      grab: ['US Pizza - Sungai Petani'],
      foodpanda: ['US Pizza (Sungai Petani)'],
      shopee: ['US Pizza - Sg Petani'],
      apps: ['US PIZZA - Sungai Petani'],
    },
  },
  {
    code: 'SB-020', name: 'Bundusan',
    sources: {
      pos: ['US Pizza Bundusan Sabah'],
      grab: ['US Pizza - Bundusan'],
      foodpanda: ['US Pizza Bundusan'],
      apps: ['US Pizza - Bundusan Sabah'],
    },
  },
  {
    code: 'MY-012', name: 'Seremban',
    sources: {
      pos: ['US Pizza Seremban'],
      grab: ['US Pizza - Seremban 2'],
      foodpanda: ['US Pizza Seremban 2'],
      shopee: ['US Pizza - Seremban 2'],
      apps: ['US Pizza - Seremban'],
    },
  },
  {
    code: 'MY-023', name: 'Bukit Mertajam',
    sources: {
      pos: ['US Pizza Bukit Mertajam'],
      grab: ['US Pizza - Bukit Mertajam'],
      foodpanda: ['US Pizza (Bukit Mertajam)'],
      shopee: ['US Pizza - Bukit Mertajam'],
      apps: ['US PIZZA - Bukit Mertajam'],
    },
  },
  {
    code: 'MY-032', name: 'Citta Mall',
    sources: {
      pos: ['US Pizza Citta Mall'],
      grab: ['US Pizza - Citta Mall'],
      foodpanda: ['US Pizza (Citta Mall)'],
      shopee: ['US Pizza - Citta Mall'],
      apps: ['US Pizza- Citta Mall'],
    },
  },
  {
    code: 'MY-010', name: 'Ayer Keroh',
    sources: {
      pos: ['US Pizza Ayer Keroh'],
      grab: ['US Pizza - Ayer Keroh'],
      foodpanda: ['US PIZZA (Ayer Keroh)'],
      shopee: ['US Pizza - Ayer Keroh'],
      apps: ['US Pizza - Ayer Keroh'],
    },
  },
  {
    code: 'MY-031', name: 'SB Mall',
    sources: {
      pos: ['US Pizza SB Mall'],
      grab: ['US Pizza - SB Mall'],
      foodpanda: ['US Pizza (SB Mall)'],
      shopee: ['US Pizza - SB Mall'],
      apps: ['US Pizza - SB Mall'],
    },
  },
  {
    code: 'MY-035', name: 'Kamunting Taiping',
    sources: {
      pos: ['US Pizza Kamunting Taiping'],
      foodpanda: ['US Pizza (Kamunting Taiping)'],
    },
  },
  {
    code: 'MY-006', name: 'USJ Taipan',
    sources: {
      pos: ['US Pizza USJ Taipan'],
      grab: ['US Pizza - USJ Taipan'],
      foodpanda: ['US Pizza USJ Taipan'],
      shopee: ['US Pizza - Taipan'],
      apps: ['US Pizza - USJ Taipan'],
    },
  },
  {
    code: 'MY-041', name: 'Anggun City',
    sources: {
      pos: ['US Pizza Rawang'],
      grab: ['Us Pizza - Anggun City Rawang'],
      foodpanda: ['US Pizza (Rawang)'],
      shopee: ['US Pizza - Rawang'],
      apps: ['US Pizza - Rawang Anggun City'],
    },
  },
  {
    code: 'MY-024', name: 'Simpang Ampat',
    sources: {
      pos: ['US Pizza Simpang Ampat'],
      grab: ['US Pizza - Simpang Ampat'],
      foodpanda: ['US PIZZA SIMPANG AMPAT'],
      shopee: ['US Pizza - Simpang Ampat'],
      apps: ['US Pizza - Simpang Ampat'],
    },
  },
  {
    code: 'SB-032', name: 'Inanam',
    sources: {
      foodpanda: ['US Pizza (EG Mall Inanam)'],
      apps: ['US Pizza - Inanam'],
    },
  },
  {
    code: 'MY-038', name: 'Batu Pahat Mall',
    sources: {
      pos: ['US Pizza Batu Pahat Mall'],
      grab: ['US Pizza - Batu Pahat Mall'],
      foodpanda: ['US Pizza (Batu Pahat Mall)'],
      shopee: ['US Pizza - Batu Pahat Mall'],
      apps: ['US PIZZA - Batu Pahat Mall'],
    },
  },
  {
    code: 'MY-001', name: 'Kelana Jaya',
    sources: {
      pos: ['US Pizza Kelana Jaya'],
      grab: ['US Pizza - Kelana Jaya'],
      shopee: ['US Pizza - Kelana Jaya'],
      apps: ['US Pizza - Kelana Jaya'],
    },
  },
  {
    code: 'MY-039', name: 'Gamuda Cove',
    sources: {
      pos: ['US Pizza Gamuda Cove'],
      grab: ['US Pizza - Gamuda Cove'],
      foodpanda: ['US Pizza (Gamuda Cove)'],
      shopee: ['US Pizza - Gamuda Cove'],
      apps: ['US PIZZA - Gamuda Cove'],
    },
  },
  {
    code: 'MY-018', name: 'Simee Ipoh',
    sources: {
      pos: ['US Pizza Simee Ipoh'],
      grab: ['US Pizza - Ipoh Simee'],
      shopee: ['US Pizza - SIMEE'],
    },
  },
  {
    code: 'MY-022', name: 'Raja Uda',
    sources: {
      pos: ['US Pizza Raja Uda'],
      grab: ['US Pizza - Raja Uda'],
      foodpanda: ['US Pizza (Raja Uda)'],
      shopee: ['US Pizza - Raja Uda'],
      apps: ['US PIZZA - Raja Uda Outlet'],
    },
  },
  {
    code: 'MY-034', name: 'Banting',
    sources: {
      pos: ['US Pizza Banting'],
      grab: ['US Pizza - Banting'],
      foodpanda: ['US Pizza (Banting)'],
      shopee: ['US Pizza - Banting'],
      apps: ['US Pizza- Banting'],
    },
  },
  {
    code: 'MY-016', name: 'Skudai',
    sources: {
      pos: ['US Pizza Skudai'],
      foodpanda: ['US Pizza Skudai'],
      shopee: ['US Pizza - Skudai'],
      apps: ['US PIZZA - Taman U Skudai'],
    },
  },
  {
    code: 'MY-011', name: 'Kota Laksamana',
    sources: {
      pos: ['US Pizza Kota Laksamana'],
      grab: ['US Pizza - Kota Laksamana'],
      foodpanda: ['US PIZZA KOTA LAKSAMANA'],
      shopee: ['US Pizza - Kota Laksamana'],
      apps: ['US PIZZA - Kota Laksamana'],
    },
  },
  {
    code: 'MY-033', name: 'Mydin Subang Jaya',
    // One outlet, two names: POS files it under the district, the delivery
    // platforms under "Mydin USJ". Confirmed by Finance as the same store.
    sources: {
      pos: ['US Pizza Mydin Subang Jaya'],
      grab: ['US Pizza - Mydin USJ'],
      foodpanda: ['US Pizza (Mydin USJ)'],
      shopee: ['US Pizza - Mydin USJ'],
      apps: ['US Pizza- Mydin USJ'],
    },
  },
  {
    code: 'MY-075', name: 'Hextar World Empire City',
    sources: {
      pos: ['US Pizza Hextar Empire City'],
      grab: ['US Pizza - Hextar World Empire City'],
      foodpanda: ['US Pizza (Empire City)'],
      shopee: ['US Pizza - Empire City'],
      apps: ['US Pizza - Hextar World'],
    },
  },
  {
    code: 'MY-025', name: 'Tanjung Tokong',
    sources: {
      pos: ['US Pizza Tanjung Tokong'],
      grab: ['US Pizza - The Landmark Tanjung Tokong'],
      shopee: ['US Pizza - Tanjung Tokong'],
      apps: ['US PIZZA - Tanjung Tokong'],
    },
  },
  {
    code: 'MY-014', name: 'Batu Pahat',
    sources: {
      pos: ['US Pizza Batu Pahat'],
      grab: ['US Pizza - Batu Pahat'],
      foodpanda: ['US PIZZA BATU PAHAT'],
      shopee: ['US Pizza - Batu Pahat'],
      apps: ['US PIZZA - Batu Pahat'],
    },
  },
  {
    code: 'MY-051', name: 'Taman Connaught',
    sources: {
      pos: ['US Pizza Taman Connaught'],
      grab: ['US Pizza - Taman Connaught'],
      foodpanda: ['US Pizza (Taman Connaught)'],
      shopee: ['US Pizza - Taman Connaught'],
      apps: ['US PIZZA - Taman Connaught', 'US PIZZA - Taman Connaught, Cheras'],
    },
  },
  {
    code: 'MY-081', name: 'Kota Damansara',
    sources: {
      grab: ['US Pizza - Kota Damansara'],
      foodpanda: ['US Pizza (Kota Damansara)'],
      shopee: ['US Pizza - Kota Damansara'],
    },
  },
]

/**
 * Names the August exports carry that are NOT HQ-owned outlets: franchise stores,
 * head office, and the Marshall's Co brand, which trades from some of the same
 * addresses but is a separate business whose sales are not ours. Confirmed once so
 * they never reach the review queue again.
 *
 * A name that is in neither this list nor OUTLET_NAME_MAP is still unknown, and
 * goes to review rather than being silently dropped.
 */
export const NON_HQ_SOURCE_NAMES: Partial<Record<AliasSource, string[]>> = {
  pos: [
    'The Manhattan Fish Market (Landmark)',
    'The Manhattan Fish Market (Taman Connaught)',
    'US Pizza  Central I-City',
    'US Pizza Bandar Dato Onn',
    'US Pizza Bangi Shoplot',
    'US Pizza EG Mall Inanam Sabah',
    'US Pizza Eco Grandeur Puncak Alam',
    'US Pizza KL Trader Square',
    'US Pizza Kota Masai',
    'US Pizza Kulim Kedah',
    'US Pizza LSH 33 Sentul',
    'US Pizza Lotus Ampang',
    'US Pizza Lotus Kepong',
    'US Pizza Matahari Sri Manja',
    'US Pizza Melaka Cheng Baru',
    'US Pizza Melawati',
    'US Pizza Penang Bandar Putra Bertam',
    'US Pizza Senadin Miri Sarawak',
    'US Pizza Sunshine Mall Penang',
    'US Pizza Sunway Wangsa Walk',
    'US Pizza Taman Sri Gombak',
    'US Pizza USJ 21',
  ],
  grab: [
    'MARSHALL\'s Co - Jalan SS15',
    'Marshall\'s Co - Bukit Mertajam',
    'Marshall\'s Co - Greenlane',
    'Marshall\'s Co - Jalan Ampang Batu 4',
    'Marshall\'s Co - Raja Uda',
    'Marshall\'s Co - SS2',
    'Marshall\'s Co - Simpang Ampat',
    'Marshall\'s Co - Sri Petaling',
    'Marshall\'s Co - Summerton',
    'US Pizza - Bandar Tun Hussein Onn',
    'US Pizza - Cheng',
    'US Pizza - Jalan Ipoh',
    'US Pizza - Jalan SS15',
    'US Pizza - Kota Kemuning',
    'US Pizza - Lotus\'s Kepong',
    'US Pizza - Lucerne Bayan Lepas',
    'US Pizza - Melawati',
    'US Pizza - Nusa Bestari',
    'US Pizza - Presint 15 Putrajaya',
    'US Pizza - Prima Saujana',
    'US Pizza - Seksyen 13 Shah Alam',
    'US Pizza - Selayang',
    'US Pizza - Subang Perdana',
    'US Pizza - Sunshine Mall Farlim',
    'US Pizza - Taiping',
    'US Pizza - Vivacity Megamall',
  ],
  foodpanda: [
    'MARSHALL\'S CO @ SIMPANG AMPAT',
    'Marshall\'s Co Bukit Mertajam',
    'Marshall\'s Co Greenlane',
    'Marshall\'s Co Jln Ampang',
    'Marshall\'s Co Raja Uda',
    'Marshall\'s Co SS2',
    'Marshall\'s Co Summerton',
    'US PIZZA (Bayan Lepas)',
    'US PIZZA (Putrajaya)',
    'US PIZZA KAJANG',
    'US PIZZA KLANG',
    'US PIZZA KOTA KEMUNING',
    'US PIZZA LANDMARK',
    'US PIZZA SELAYANG',
    'US PIZZA SEMENYIH',
    'US PIZZA SRI MANJA',
    'US Pizza (Bandar Dato Onn)',
    'US Pizza (Bangi Shoplot)',
    'US Pizza (Bertam)',
    'US Pizza (Central I-City)',
    'US Pizza (Cheng)',
    'US Pizza (Eco Grandeur)',
    'US Pizza (KL Traders Square)',
    'US Pizza (Kepong)',
    'US Pizza (Kota Masai)',
    'US Pizza (Kuala Pilah)',
    'US Pizza (Kulim)',
    'US Pizza (LSH33 Sentul)',
    'US Pizza (Lotus\'s Kepong)',
    'US Pizza (Lucerne Square)',
    'US Pizza (Matahari Sri Manja)',
    'US Pizza (Melawati)',
    'US Pizza (Senadin Miri)',
    'US Pizza (Setia Ecohill)',
    'US Pizza (Shah Alam)',
    'US Pizza (Subang Perdana)',
    'US Pizza (Sunshine Central)',
    'US Pizza (Taman Sri Gombak)',
    'US Pizza (USJ 21)',
    'US Pizza (Wangsa Walk)',
    'US Pizza Ipoh',
    'US Pizza Jalan Ipoh',
    'US Pizza Nilai',
    'US Pizza Prima Saujana',
  ],
  shopee: [
    'The Manhattan FISH MARKET - Kota Damansara',
    'The Manhattan FISH MARKET - Landmark',
    'The Manhattan FISH MARKET - Taman Connaught',
    'US Pizza - Kulim',
    'US Pizza - Melawati',
    'US Pizza - Sunshine Central',
    'US Pizza - Taiping',
  ],
  apps: [
    'US PIZZA - Bangi',
    'US PIZZA - Cheng',
    'US PIZZA - Kulim Outlet',
    'US PIZZA - Menara U2',
    'US PIZZA - Miri',
    'US PIZZA - Putrajaya',
    'US PIZZA - Shah Alam Seksyen 7',
    'US PIZZA - Taiping, Perak',
    'US PIZZA - Taman Sri Gombak',
    'US PIZZA - USJ 21',
    'US PIZZA HQ',
    'US PIZZA- Jalan Ipoh',
    'US Pizza - Bandar Dato Onn',
    'US Pizza - Bandar Tun Hussein Onn',
    'US Pizza - Bertam',
    'US Pizza - Central i-City',
    'US Pizza - Ipoh',
    'US Pizza - KL Traders Square',
    'US Pizza - Kajang',
    'US Pizza - Kepong',
    'US Pizza - Klang',
    'US Pizza - Kuala Pilah',
    'US Pizza - LSH Sentul',
    'US Pizza - Lotus\'s Ampang',
    'US Pizza - Lotus\'s Kepong',
    'US Pizza - Matahari Sri Manja',
    'US Pizza - Melawati Mall',
    'US Pizza - Nilai',
    'US Pizza - Nusa Bestari, Skudai',
    'US Pizza - Puncak Alam',
    'US Pizza - Setia Ecohill',
    'US Pizza - Sunshine',
    'US Pizza - Wangsawalk',
    'Us Pizza - Kota Masai',
  ],
}
