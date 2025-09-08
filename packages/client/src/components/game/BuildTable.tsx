import React, { useMemo } from "react";
import NetworkAwareButton from "../ui/NetworkAwareButton";

export interface Eligibility {
  canStart: boolean;
  reasons: string[];
}

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  className?: string;
  render: (item: T) => React.ReactNode;
}

export interface BuildTableProps<T> {
  // Card header
  title: string;
  summary?: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void;

  // Data
  items: T[];

  // Identity/test hooks
  getKey: (item: T) => string;

  // First column content
  getTitleText: (item: T) => string | React.ReactNode;
  getDescriptionText?: (item: T) => string | React.ReactNode;

  // Eligibility for reasons line and action tooltip/disable
  getEligibility: (item: T) => Eligibility;

  // Middle columns (excluding first "Title" and last "Action")
  columns: Column<T>[];

  // Action column
  onAction: (item: T) => void | Promise<void>;
  onQueue?: (item: T) => Promise<{ success: boolean; eventId?: number; error?: string }>;
  isOffline?: boolean;
  actionLabel?: (item: T, eligible: boolean, loading?: boolean, isOffline?: boolean) => string;
  actionTestIdPrefix?: string; // default "action"
  nameTestIdPrefix?: string; // default "name"

  // Sorting (default: leave order as provided)
  defaultSort?: (a: T, b: T) => number;

  // Optional table-level test id
  tableTestId?: string; // default "build-table"

  // Optional custom column headers
  firstColumnHeader?: string;
  actionHeader?: string;
}

/**
 * BuildTable (generic)
 * - Implements standardized compact table styling and behavior per .clinerules/tabular-build-ui-standard-and-test-plan.md
 * - First column: name (white), optional description (gray), and red reasons line when ineligible
 * - Last column: right-aligned Start/Build action button with disabled tooltip listing reasons
 * - Sticky header, compact rows, consistent classes
 */
const BuildTable = <T,>(props: BuildTableProps<T>) => {
  const {
    title,
    summary,
    loading,
    onRefresh,
    items,
    getKey,
    getTitleText,
    getDescriptionText,
    getEligibility,
    columns,
    onAction,
    actionLabel,
    actionTestIdPrefix = "action",
    nameTestIdPrefix = "name",
    defaultSort,
    firstColumnHeader,
    actionHeader,
    tableTestId = "build-table",
  } = props;

  const sortedItems = useMemo(() => {
    if (!items) return [];
    if (typeof defaultSort === "function") {
      return items.slice().sort(defaultSort);
    }
    return items;
  }, [items, defaultSort]);

  return (
    <div className="game-card !bg-gray-900 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">{title}</h3>
        <div className="flex items-center gap-2">
          {summary}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table data-testid={tableTestId} className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              {/* First column header (e.g., Defense | Structure | Technology | Unit) */}
              <th className="py-2 px-3 text-left">{firstColumnHeader ?? ""}</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-2 px-3 ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  {col.header}
                </th>
              ))}
              <th className="py-2 px-3 text-right">{actionHeader ?? ""}</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const key = getKey(item);
              const eligibility = getEligibility(item);
              const { canStart, reasons } = eligibility;
              const reasonsLine =
                !canStart && Array.isArray(reasons) && reasons.length > 0 ? reasons.join("; ") : "";

              const buttonLabel =
                typeof actionLabel === "function"
                  ? actionLabel(item, canStart, loading)
                  : loading
                  ? "..."
                  : canStart
                  ? "Start"
                  : "Unavailable";

              return (
                <tr
                  key={key}
                  data-testid={`row-${key}`}
                  className="border-b border-gray-800 hover:bg-gray-800/60"
                >
                  {/* Title / description / reasons */}
                  <td className="py-2 px-3 align-top">
                    <div className="text-white" data-testid={`${nameTestIdPrefix}-${key}`}>
                      {getTitleText(item)}
                    </div>
                    {getDescriptionText && (
                      <div className="text-xs text-gray-400">{getDescriptionText(item)}</div>
                    )}
                    {reasonsLine && (
                      <div className="text-xs text-red-300 mt-1">{reasonsLine}</div>
                    )}
                  </td>

                  {/* Middle columns */}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2 px-3 align-top ${
                        col.align === "right" ? "text-right" : "text-left"
                      } ${col.className || ""}`}
                    >
                      {col.render(item)}
                    </td>
                  ))}

                  {/* Action column */}
                  <td className="py-2 px-3 text-right align-top">
                    <NetworkAwareButton
                      data-testid={`${actionTestIdPrefix}-${key}`}
                      disabled={!canStart || !!loading}
                      onClick={() => onAction(item)}
                      title={!canStart && reasonsLine ? reasonsLine : undefined}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        canStart && !loading
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-gray-600 text-gray-400 cursor-not-allowed"
                      }`}
                      requiresNetwork={true}
                      networkDisabledTooltip="Action unavailable while offline"
                    >
                      {buttonLabel}
                    </NetworkAwareButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BuildTable;
