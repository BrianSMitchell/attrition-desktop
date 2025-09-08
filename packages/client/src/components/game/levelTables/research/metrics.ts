/**
 * Centralized Research Metrics: canonical constants and small pure helpers.
 * This is the single source of truth for research metric keys, labels, and kinds.
 */

export const METRIC_PRIORITY = [
  'baseEnergyOutputPct',
  'baseResearchOutputPct',
  'baseConstructionProductionOutputPct',
  'campaignFleets',
  'unitsArmourPct',
  'unitsShieldStrengthPct',
  'laserWeaponsAttackPct',
  'photonWeaponsAttackPct',
  'missilesWeaponsAttackPct',
  'stellarUnitsSpeedPct',
  'warpUnitsSpeedPct',
  'plasmaWeaponsAttackPct',
  'ionWeaponsAttackPct',
  'disruptorWeaponsAttackPct',
] as const;

export type MetricKey = (typeof METRIC_PRIORITY)[number];

export const METRIC_LABELS: Record<MetricKey, string> = {
  baseEnergyOutputPct: 'Base Energy Output',
  baseResearchOutputPct: 'Base Research Output',
  baseConstructionProductionOutputPct: 'Construction & Production Output',
  campaignFleets: 'Campaign Fleets',
  unitsArmourPct: 'Units Armour',
  unitsShieldStrengthPct: 'Shield Strength',
  laserWeaponsAttackPct: 'Laser Weapons Attack',
  photonWeaponsAttackPct: 'Photon Weapons Attack',
  missilesWeaponsAttackPct: 'Missiles Weapons Attack',
  stellarUnitsSpeedPct: 'Stellar Units Speed',
  warpUnitsSpeedPct: 'Warp Units Speed',
  plasmaWeaponsAttackPct: 'Plasma Weapons Attack',
  ionWeaponsAttackPct: 'Ion Weapons Attack',
  disruptorWeaponsAttackPct: 'Disruptor Weapons Attack',
};

export const METRIC_KIND: Record<MetricKey, 'percent' | 'count'> = {
  baseEnergyOutputPct: 'percent',
  baseResearchOutputPct: 'percent',
  baseConstructionProductionOutputPct: 'percent',
  campaignFleets: 'count',
  unitsArmourPct: 'percent',
  unitsShieldStrengthPct: 'percent',
  laserWeaponsAttackPct: 'percent',
  photonWeaponsAttackPct: 'percent',
  missilesWeaponsAttackPct: 'percent',
  stellarUnitsSpeedPct: 'percent',
  warpUnitsSpeedPct: 'percent',
  plasmaWeaponsAttackPct: 'percent',
  ionWeaponsAttackPct: 'percent',
  disruptorWeaponsAttackPct: 'percent',
};

export type ResearchLevelRow = {
  level: number;
  credits: number;
  labs?: number;
  requires?: string;
  effect?: string;
} & Partial<Record<MetricKey, number>>;

/**
 * Row-like shape used by helper functions.
 * Loosened to accept existing tables where credits may be optional.
 */
export type ResearchRowLike = {
  labs?: number;
  requires?: string;
  effect?: string;
} & Partial<Record<MetricKey, number>>;

/**
 * Select the first visible metric key present in any row, according to priority order.
 */
export function selectVisibleMetricKey(
  rows: ReadonlyArray<ResearchRowLike>
): MetricKey | undefined {
  return METRIC_PRIORITY.find((k) => rows.some((r) => typeof r[k] === 'number'));
}

/**
 * True when the table is purely Level/Credits (no metric and no labs/requires/effect).
 */
export function computeHasCreditsOnly(
  rows: ReadonlyArray<ResearchRowLike>,
  visibleMetricKey?: MetricKey
): boolean {
  return (
    rows.length > 0 &&
    !visibleMetricKey &&
    rows.every((r) => typeof r.labs !== 'number' && !r.requires && !r.effect)
  );
}

/**
 * Derive empty-state colSpan based on derived columns.
 * - 2 when credits-only
 * - 3 when a metric column is visible
 * - 5 when labs/requires/effect is used (no metric)
 */
export function computeEmptyStateColSpan(
  hasCreditsOnly: boolean,
  visibleMetricKey?: MetricKey
): number {
  return hasCreditsOnly ? 2 : visibleMetricKey ? 3 : 5;
}
