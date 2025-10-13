import { METRIC_PRIORITY, selectVisibleMetricKey, computeHasCreditsOnly, computeEmptyStateColSpan } from '../metrics';
import type { MetricKey, ResearchRowLike } from '../metrics';

describe('selectVisibleMetricKey', () => {
  it('returns undefined when no metric keys are present', () => {
    const rows: ResearchRowLike[] = [{}, {}];
    const key = selectVisibleMetricKey(rows);
    expect(key).toBeUndefined();
  });

  it('respects priority order when multiple metrics exist across rows', () => {
    // missilesWeaponsAttackPct appears before ionWeaponsAttackPct in METRIC_PRIORITY
    const rows: ResearchRowLike[] = [
      { ionWeaponsAttackPct: 15 },
      { missilesWeaponsAttackPct: 10 },
    ];
    const key = selectVisibleMetricKey(rows);
    expect(key).toBe('missilesWeaponsAttackPct');
    // sanity check that missiles is before ion in the priority list
    expect(METRIC_PRIORITY.indexOf('missilesWeaponsAttackPct')).toBeLessThan(
      METRIC_PRIORITY.indexOf('ionWeaponsAttackPct')
    );
  });

  it('finds the first present metric in priority order even if defined in later rows', () => {
    // Ensure a metric near the top of the list takes precedence over any later-ordered metrics
    const rows: ResearchRowLike[] = [
      { disruptorWeaponsAttackPct: 7 },
      { baseEnergyOutputPct: 5 }, // highest priority in list
      { campaignFleets: 2 },
    ];
    const key = selectVisibleMetricKey(rows);
    expect(key).toBe('baseEnergyOutputPct');
  });

  it('detects single present metric', () => {
    const rows: ResearchRowLike[] = [{ campaignFleets: 3 }];
    const key = selectVisibleMetricKey(rows);
    expect(key).toBe('campaignFleets');
  });
});

describe('computeHasCreditsOnly', () => {
  it('returns true for rows with no metric and no labs/requires/effect', () => {
    // Visible metric is undefined and all rows have no labs/requires/effect
    const rows: ResearchRowLike[] = [{}, {}, {}];
    const visibleMetricKey = undefined;
    const hasCreditsOnly = computeHasCreditsOnly(rows, visibleMetricKey);
    expect(hasCreditsOnly).toBe(true);
  });

  it('returns false when a metric exists', () => {
    const rows: ResearchRowLike[] = [{ baseResearchOutputPct: 12 }];
    const visibleMetricKey = selectVisibleMetricKey(rows);
    expect(visibleMetricKey).toBe('baseResearchOutputPct');

    const hasCreditsOnly = computeHasCreditsOnly(rows, visibleMetricKey);
    expect(hasCreditsOnly).toBe(false);
  });

  it('returns false when labs is present but no metric', () => {
    const rows: ResearchRowLike[] = [{ labs: 3 }, {}];
    const visibleMetricKey = undefined;
    const hasCreditsOnly = computeHasCreditsOnly(rows, visibleMetricKey);
    expect(hasCreditsOnly).toBe(false);
  });

  it('returns false when requires is present but no metric', () => {
    const rows: ResearchRowLike[] = [{ requires: 'Prereq X' }];
    const visibleMetricKey = undefined;
    const hasCreditsOnly = computeHasCreditsOnly(rows, visibleMetricKey);
    expect(hasCreditsOnly).toBe(false);
  });

  it('returns false when effect is present but no metric', () => {
    const rows: ResearchRowLike[] = [{ effect: '+5% something' }];
    const visibleMetricKey = undefined;
    const hasCreditsOnly = computeHasCreditsOnly(rows, visibleMetricKey);
    expect(hasCreditsOnly).toBe(false);
  });
});

describe('computeEmptyStateColSpan', () => {
  it('returns 2 when credits-only', () => {
    expect(computeEmptyStateColSpan(true, undefined)).toBe(2);
  });

  it('returns 3 when a metric column is visible', () => {
    const visibleMetricKey = 'missilesWeaponsAttackPct' as MetricKey;
    expect(computeEmptyStateColSpan(false, visibleMetricKey)).toBe(3);
  });

  it('returns 5 when labs/requires/effect columns are used (no metric and not credits-only)', () => {
    // hasCreditsOnly is false and visibleMetricKey is undefined
    expect(computeEmptyStateColSpan(false, undefined)).toBe(5);
  });
});
