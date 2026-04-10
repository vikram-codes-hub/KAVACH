/**
 * Real demographic data for Indian districts
 * Sources: Census of India 2011, NFHS-5 (2019-21), SECC 2011, NDMA Vulnerability Atlas
 *
 * Fields per district:
 *   pop_lakh        — total population in lakhs
 *   elderly_pct     — % population aged 60+
 *   disabled_pct    — % with any disability
 *   pregnant_per1000— pregnant women per 1000 women (NFHS-5)
 *   no_smartphone_pct — % households without smartphone (estimated from NFHS-5)
 *   no_vehicle_pct  — % households without any vehicle
 *   bpl_pct         — % below poverty line (SECC proxy)
 *   literacy_pct    — literacy rate
 *   rural_pct       — % rural population
 *   migrant_pct     — % migrant workers (estimated)
 *   tourist_pct     — tourist-heavy area flag (0-1 scale)
 *   flood_risk      — NDMA flood vulnerability (low/medium/high/extreme)
 *   primary_occupations — top 3 occupations in district
 *   vulnerable_groups   — key vulnerable demographics for this district
 */

const DISTRICT_DEMOGRAPHICS = {

  // ── UTTARAKHAND ──────────────────────────────────────────────
  'dehradun': {
    state: 'Uttarakhand', pop_lakh: 16.96,
    elderly_pct: 8.2, disabled_pct: 2.1, pregnant_per1000: 28,
    no_smartphone_pct: 38, no_vehicle_pct: 42, bpl_pct: 11.6,
    literacy_pct: 84.2, rural_pct: 35, migrant_pct: 12, tourist_pct: 0.7,
    flood_risk: 'high',
    primary_occupations: ['government service', 'tourism/hospitality', 'agriculture', 'daily wage labour'],
    vulnerable_groups: ['elderly living alone in hill areas', 'tourists unfamiliar with terrain', 'daily wage workers in low-lying areas', 'pregnant women in remote localities']
  },
  'chamoli': {
    state: 'Uttarakhand', pop_lakh: 3.92,
    elderly_pct: 14.1, disabled_pct: 2.8, pregnant_per1000: 32,
    no_smartphone_pct: 62, no_vehicle_pct: 71, bpl_pct: 28.4,
    literacy_pct: 79.9, rural_pct: 88, migrant_pct: 22, tourist_pct: 0.9,
    flood_risk: 'extreme',
    primary_occupations: ['agriculture', 'pilgrimage tourism', 'MNREGA labour', 'small trade'],
    vulnerable_groups: ['pilgrims at high altitude', 'elderly in remote villages', 'women with no phone', 'construction workers at remote sites']
  },
  'rudraprayag': {
    state: 'Uttarakhand', pop_lakh: 2.42,
    elderly_pct: 15.3, disabled_pct: 3.1, pregnant_per1000: 34,
    no_smartphone_pct: 68, no_vehicle_pct: 78, bpl_pct: 31.2,
    literacy_pct: 81.3, rural_pct: 92, migrant_pct: 28, tourist_pct: 0.95,
    flood_risk: 'extreme',
    primary_occupations: ['pilgrimage services', 'agriculture', 'daily wage', 'small shops'],
    vulnerable_groups: ['Kedarnath pilgrims', 'elderly women alone (men migrated)', 'children in boarding schools', 'roadside dhaba workers']
  },
  'uttarkashi': {
    state: 'Uttarakhand', pop_lakh: 3.30,
    elderly_pct: 13.8, disabled_pct: 2.6, pregnant_per1000: 31,
    no_smartphone_pct: 65, no_vehicle_pct: 74, bpl_pct: 26.8,
    literacy_pct: 75.8, rural_pct: 90, migrant_pct: 25, tourist_pct: 0.6,
    flood_risk: 'extreme',
    primary_occupations: ['agriculture', 'forest labour', 'trekking guides', 'daily wage'],
    vulnerable_groups: ['remote village elderly', 'trekkers and tourists', 'pregnant women far from hospitals', 'school children']
  },

  // ── HIMACHAL PRADESH ─────────────────────────────────────────
  'kullu': {
    state: 'Himachal Pradesh', pop_lakh: 4.38,
    elderly_pct: 10.2, disabled_pct: 2.3, pregnant_per1000: 26,
    no_smartphone_pct: 44, no_vehicle_pct: 38, bpl_pct: 9.8,
    literacy_pct: 79.4, rural_pct: 80, migrant_pct: 8, tourist_pct: 0.95,
    flood_risk: 'high',
    primary_occupations: ['apple farming', 'tourism', 'government service', 'daily wage'],
    vulnerable_groups: ['tourists in river valleys', 'apple orchard workers', 'elderly in remote villages', 'hotel staff in flood zones']
  },

  // ── ASSAM ────────────────────────────────────────────────────
  'kamrup': {
    state: 'Assam', pop_lakh: 26.29,
    elderly_pct: 7.1, disabled_pct: 2.4, pregnant_per1000: 35,
    no_smartphone_pct: 55, no_vehicle_pct: 58, bpl_pct: 32.1,
    literacy_pct: 79.0, rural_pct: 72, migrant_pct: 15, tourist_pct: 0.2,
    flood_risk: 'extreme',
    primary_occupations: ['agriculture', 'tea garden labour', 'daily wage', 'small trade'],
    vulnerable_groups: ['char (river island) residents', 'tea garden workers', 'pregnant women in remote areas', 'elderly in flood-prone villages']
  },
  'dhubri': {
    state: 'Assam', pop_lakh: 19.49,
    elderly_pct: 6.8, disabled_pct: 2.6, pregnant_per1000: 42,
    no_smartphone_pct: 72, no_vehicle_pct: 68, bpl_pct: 45.2,
    literacy_pct: 61.0, rural_pct: 91, migrant_pct: 18, tourist_pct: 0.1,
    flood_risk: 'extreme',
    primary_occupations: ['agriculture', 'fishing', 'daily wage', 'boat transport'],
    vulnerable_groups: ['char island residents', 'fishermen families', 'women with no phone', 'children in low-lying schools']
  },

  // ── BIHAR ────────────────────────────────────────────────────
  'darbhanga': {
    state: 'Bihar', pop_lakh: 39.37,
    elderly_pct: 7.4, disabled_pct: 3.1, pregnant_per1000: 44,
    no_smartphone_pct: 74, no_vehicle_pct: 72, bpl_pct: 52.4,
    literacy_pct: 52.2, rural_pct: 94, migrant_pct: 32, tourist_pct: 0.1,
    flood_risk: 'extreme',
    primary_occupations: ['agriculture', 'daily wage', 'migrant labour', 'small trade'],
    vulnerable_groups: ['women with no phone', 'elderly in kutcha houses', 'children', 'pregnant women far from hospitals']
  },
  'sitamarhi': {
    state: 'Bihar', pop_lakh: 34.23,
    elderly_pct: 7.2, disabled_pct: 3.3, pregnant_per1000: 46,
    no_smartphone_pct: 78, no_vehicle_pct: 76, bpl_pct: 55.1,
    literacy_pct: 52.0, rural_pct: 96, migrant_pct: 35, tourist_pct: 0.05,
    flood_risk: 'extreme',
    primary_occupations: ['agriculture', 'daily wage', 'migrant labour', 'animal husbandry'],
    vulnerable_groups: ['women alone (husbands migrated)', 'elderly', 'children under 5', 'disabled persons in remote villages']
  },

  // ── ODISHA ───────────────────────────────────────────────────
  'puri': {
    state: 'Odisha', pop_lakh: 16.98,
    elderly_pct: 9.8, disabled_pct: 2.7, pregnant_per1000: 30,
    no_smartphone_pct: 58, no_vehicle_pct: 55, bpl_pct: 22.3,
    literacy_pct: 82.0, rural_pct: 68, migrant_pct: 10, tourist_pct: 0.9,
    flood_risk: 'extreme',
    primary_occupations: ['fishing', 'tourism/pilgrimage', 'agriculture', 'daily wage'],
    vulnerable_groups: ['coastal fishermen', 'pilgrims at Jagannath temple', 'elderly in coastal villages', 'tourists']
  },
  'kendrapara': {
    state: 'Odisha', pop_lakh: 14.40,
    elderly_pct: 9.2, disabled_pct: 2.9, pregnant_per1000: 32,
    no_smartphone_pct: 64, no_vehicle_pct: 62, bpl_pct: 28.6,
    literacy_pct: 80.0, rural_pct: 88, migrant_pct: 14, tourist_pct: 0.2,
    flood_risk: 'extreme',
    primary_occupations: ['fishing', 'agriculture', 'daily wage', 'prawn farming'],
    vulnerable_groups: ['coastal fishing communities', 'women in remote villages', 'elderly', 'children in low-lying schools']
  },

  // ── KERALA ───────────────────────────────────────────────────
  'wayanad': {
    state: 'Kerala', pop_lakh: 8.17,
    elderly_pct: 12.1, disabled_pct: 2.2, pregnant_per1000: 22,
    no_smartphone_pct: 28, no_vehicle_pct: 25, bpl_pct: 14.2,
    literacy_pct: 89.0, rural_pct: 75, migrant_pct: 8, tourist_pct: 0.7,
    flood_risk: 'extreme',
    primary_occupations: ['coffee/tea plantation', 'tourism', 'agriculture', 'daily wage'],
    vulnerable_groups: ['tribal communities in remote areas', 'plantation workers', 'tourists in hill stations', 'elderly in landslide-prone areas']
  },
  'ernakulam': {
    state: 'Kerala', pop_lakh: 32.82,
    elderly_pct: 13.4, disabled_pct: 2.0, pregnant_per1000: 20,
    no_smartphone_pct: 22, no_vehicle_pct: 18, bpl_pct: 7.8,
    literacy_pct: 95.9, rural_pct: 45, migrant_pct: 6, tourist_pct: 0.5,
    flood_risk: 'high',
    primary_occupations: ['trade/commerce', 'IT/services', 'fishing', 'government service'],
    vulnerable_groups: ['elderly in low-lying areas', 'fishing communities', 'persons with disability', 'migrant workers']
  },

  // ── RAJASTHAN ────────────────────────────────────────────────
  'jaipur': {
    state: 'Rajasthan', pop_lakh: 66.26,
    elderly_pct: 8.1, disabled_pct: 2.3, pregnant_per1000: 29,
    no_smartphone_pct: 42, no_vehicle_pct: 35, bpl_pct: 14.7,
    literacy_pct: 76.4, rural_pct: 52, migrant_pct: 9, tourist_pct: 0.9,
    flood_risk: 'medium',
    primary_occupations: ['tourism', 'government service', 'trade', 'handicrafts'],
    vulnerable_groups: ['tourists in walled city', 'daily wage workers in low-lying areas', 'elderly in old city', 'street vendors']
  },
  'barmer': {
    state: 'Rajasthan', pop_lakh: 25.44,
    elderly_pct: 7.8, disabled_pct: 2.8, pregnant_per1000: 38,
    no_smartphone_pct: 68, no_vehicle_pct: 52, bpl_pct: 38.2,
    literacy_pct: 56.5, rural_pct: 88, migrant_pct: 20, tourist_pct: 0.1,
    flood_risk: 'medium',
    primary_occupations: ['agriculture', 'animal husbandry', 'daily wage', 'oil field labour'],
    vulnerable_groups: ['women with no phone', 'elderly in remote villages', 'children', 'migrant oil workers']
  },

  // ── MAHARASHTRA ──────────────────────────────────────────────
  'raigad': {
    state: 'Maharashtra', pop_lakh: 26.35,
    elderly_pct: 9.3, disabled_pct: 2.4, pregnant_per1000: 27,
    no_smartphone_pct: 45, no_vehicle_pct: 40, bpl_pct: 18.4,
    literacy_pct: 82.0, rural_pct: 62, migrant_pct: 12, tourist_pct: 0.4,
    flood_risk: 'extreme',
    primary_occupations: ['fishing', 'agriculture', 'industrial labour', 'daily wage'],
    vulnerable_groups: ['coastal fishing communities', 'tribal communities in ghats', 'industrial workers', 'elderly in remote villages']
  },
  'kolhapur': {
    state: 'Maharashtra', pop_lakh: 38.76,
    elderly_pct: 9.8, disabled_pct: 2.5, pregnant_per1000: 25,
    no_smartphone_pct: 40, no_vehicle_pct: 32, bpl_pct: 16.2,
    literacy_pct: 81.5, rural_pct: 58, migrant_pct: 10, tourist_pct: 0.3,
    flood_risk: 'high',
    primary_occupations: ['agriculture', 'sugar industry', 'trade', 'daily wage'],
    vulnerable_groups: ['farmers in flood plains', 'sugar mill workers', 'elderly', 'persons with disability']
  },

  // ── ANDHRA PRADESH ───────────────────────────────────────────
  'krishna': {
    state: 'Andhra Pradesh', pop_lakh: 45.17,
    elderly_pct: 9.6, disabled_pct: 2.6, pregnant_per1000: 28,
    no_smartphone_pct: 48, no_vehicle_pct: 44, bpl_pct: 19.8,
    literacy_pct: 74.6, rural_pct: 65, migrant_pct: 11, tourist_pct: 0.2,
    flood_risk: 'extreme',
    primary_occupations: ['agriculture', 'fishing', 'daily wage', 'aquaculture'],
    vulnerable_groups: ['delta farmers', 'fishing communities', 'elderly in low-lying areas', 'women with no phone']
  },

  // ── WEST BENGAL ──────────────────────────────────────────────
  'south 24 parganas': {
    state: 'West Bengal', pop_lakh: 81.61,
    elderly_pct: 8.4, disabled_pct: 2.7, pregnant_per1000: 33,
    no_smartphone_pct: 62, no_vehicle_pct: 65, bpl_pct: 34.2,
    literacy_pct: 77.5, rural_pct: 82, migrant_pct: 18, tourist_pct: 0.3,
    flood_risk: 'extreme',
    primary_occupations: ['fishing', 'agriculture', 'daily wage', 'crab/prawn farming'],
    vulnerable_groups: ['Sundarbans island residents', 'fishermen', 'women with no phone', 'elderly in remote islands']
  },

  // ── GUJARAT ──────────────────────────────────────────────────
  'kutch': {
    state: 'Gujarat', pop_lakh: 20.92,
    elderly_pct: 8.9, disabled_pct: 2.5, pregnant_per1000: 27,
    no_smartphone_pct: 50, no_vehicle_pct: 38, bpl_pct: 22.1,
    literacy_pct: 70.6, rural_pct: 68, migrant_pct: 14, tourist_pct: 0.5,
    flood_risk: 'high',
    primary_occupations: ['animal husbandry', 'salt farming', 'trade', 'daily wage'],
    vulnerable_groups: ['nomadic communities', 'salt pan workers', 'elderly in remote villages', 'women with no phone']
  },

  // ── TAMIL NADU ───────────────────────────────────────────────
  'chennai': {
    state: 'Tamil Nadu', pop_lakh: 70.88,
    elderly_pct: 10.8, disabled_pct: 2.1, pregnant_per1000: 22,
    no_smartphone_pct: 30, no_vehicle_pct: 28, bpl_pct: 9.2,
    literacy_pct: 90.2, rural_pct: 12, migrant_pct: 8, tourist_pct: 0.4,
    flood_risk: 'high',
    primary_occupations: ['IT/services', 'trade', 'daily wage', 'fishing'],
    vulnerable_groups: ['slum residents in low-lying areas', 'elderly', 'coastal fishing communities', 'persons with disability']
  },

  // ── DEFAULT FALLBACK ─────────────────────────────────────────
  'default': {
    state: 'India', pop_lakh: 10.0,
    elderly_pct: 8.5, disabled_pct: 2.5, pregnant_per1000: 30,
    no_smartphone_pct: 55, no_vehicle_pct: 55, bpl_pct: 25.0,
    literacy_pct: 74.0, rural_pct: 70, migrant_pct: 15, tourist_pct: 0.2,
    flood_risk: 'high',
    primary_occupations: ['agriculture', 'daily wage', 'small trade', 'government service'],
    vulnerable_groups: ['elderly living alone', 'pregnant women', 'persons with disability', 'daily wage workers']
  }
};

/**
 * Look up demographic data for a district.
 * Tries exact match, then partial match, then state-level default, then national default.
 */
const getDemographics = (district, state) => {
  if (!district) return DISTRICT_DEMOGRAPHICS['default'];

  const key = district.toLowerCase().trim();

  // Exact match
  if (DISTRICT_DEMOGRAPHICS[key]) return DISTRICT_DEMOGRAPHICS[key];

  // Partial match (e.g. "Dehradun District" → "dehradun")
  for (const [k, v] of Object.entries(DISTRICT_DEMOGRAPHICS)) {
    if (k !== 'default' && (key.includes(k) || k.includes(key.split(' ')[0]))) {
      return v;
    }
  }

  // State-level fallback — pick any district from that state
  if (state) {
    const stateLower = state.toLowerCase();
    for (const [k, v] of Object.entries(DISTRICT_DEMOGRAPHICS)) {
      if (k !== 'default' && v.state.toLowerCase().includes(stateLower)) {
        return { ...v }; // return state-level proxy
      }
    }
  }

  return DISTRICT_DEMOGRAPHICS['default'];
};

/**
 * Convert demographics into agent distribution constraints.
 * Returns how many agents of each vulnerability type to generate
 * based on real population proportions.
 */
const getAgentConstraints = (demographics, totalAgents = 50) => {
  const d = demographics;

  // Scale real percentages to agent counts
  const elderlyCount    = Math.max(2, Math.round(totalAgents * d.elderly_pct / 100));
  const disabledCount   = Math.max(1, Math.round(totalAgents * d.disabled_pct / 100));
  const pregnantCount   = Math.max(1, Math.round(totalAgents * (d.pregnant_per1000 / 1000) * 5)); // scaled
  const noPhoneCount    = Math.max(3, Math.round(totalAgents * d.no_smartphone_pct / 100));
  const noVehicleCount  = Math.max(4, Math.round(totalAgents * d.no_vehicle_pct / 100));
  const bplCount        = Math.max(3, Math.round(totalAgents * d.bpl_pct / 100));
  const migrantCount    = Math.max(1, Math.round(totalAgents * d.migrant_pct / 100));
  const touristCount    = Math.max(1, Math.round(totalAgents * d.tourist_pct * 0.15));

  return {
    elderlyCount:   Math.min(elderlyCount, 8),
    disabledCount:  Math.min(disabledCount, 4),
    pregnantCount:  Math.min(pregnantCount, 3),
    noPhoneCount:   Math.min(noPhoneCount, 15),
    noVehicleCount: Math.min(noVehicleCount, 20),
    bplCount:       Math.min(bplCount, 12),
    migrantCount:   Math.min(migrantCount, 5),
    touristCount:   Math.min(touristCount, 4),
    primaryOccupations: d.primary_occupations,
    vulnerableGroups:   d.vulnerable_groups,
    popLakh:            d.pop_lakh,
    ruralPct:           d.rural_pct,
    literacyPct:        d.literacy_pct
  };
};

module.exports = { getDemographics, getAgentConstraints, DISTRICT_DEMOGRAPHICS };