import type { Category } from "../types/city";
import type { SearchFilters } from "../types/event";
import { DATE_PRESETS } from "../utils/dateUtils";

interface Props {
  categories: Category[];
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  onReset: () => void;
}

const RADIUS_OPTIONS = [
  { value: 0, label: "In this city" },
  { value: 5, label: "Within 5 mi" },
  { value: 10, label: "Within 10 mi" },
  { value: 25, label: "Within 25 mi" },
];

export default function FilterPanel({ categories, filters, onChange, onReset }: Props) {
  const activePreset = DATE_PRESETS.find((p) => {
    const r = p.range();
    return r.startDate === filters.startDate && r.endDate === filters.endDate;
  })?.id;
  const invalidRange = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate);
  const hasFilters = Boolean(
    filters.keyword || filters.category || filters.startDate || filters.endDate || filters.radius,
  );

  return (
    <div className="filters">
      <div className="filters__row" role="group" aria-label="Category">
        <button
          type="button"
          className={`pill ${!filters.category ? "pill--active" : ""}`}
          aria-pressed={!filters.category}
          onClick={() => onChange({ category: undefined })}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            type="button"
            key={c.id}
            className={`pill ${filters.category === c.id ? "pill--active" : ""}`}
            aria-pressed={filters.category === c.id}
            onClick={() => onChange({ category: filters.category === c.id ? undefined : c.id })}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="filters__row filters__row--dates">
        <div className="filters__presets" role="group" aria-label="Date presets">
          {DATE_PRESETS.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`pill pill--subtle ${activePreset === p.id ? "pill--active" : ""}`}
              aria-pressed={activePreset === p.id}
              onClick={() =>
                activePreset === p.id ? onChange({ startDate: undefined, endDate: undefined }) : onChange(p.range())
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>From</span>
          <input
            type="date"
            className="input"
            value={filters.startDate ?? ""}
            onChange={(e) => onChange({ startDate: e.target.value || undefined })}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            type="date"
            className="input"
            value={filters.endDate ?? ""}
            min={filters.startDate}
            onChange={(e) => onChange({ endDate: e.target.value || undefined })}
          />
        </label>
        <label className="field">
          <span>Area</span>
          <select
            className="input"
            value={filters.radius ?? 0}
            onChange={(e) => onChange({ radius: Number(e.target.value) || undefined })}
          >
            {RADIUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {hasFilters && (
          <button type="button" className="btn btn--ghost" onClick={onReset}>
            Clear all
          </button>
        )}
      </div>

      {invalidRange && (
        <p className="field-error" role="alert">
          The start date must be on or before the end date.
        </p>
      )}
    </div>
  );
}
