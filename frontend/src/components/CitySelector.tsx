import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { City } from "../types/city";

interface Props {
  regions: string[];
  cities: City[];
}

const REGION_BLURBS: Record<string, string> = {
  "San Francisco and the Peninsula": "The city and down the 101 corridor",
  "East Bay": "Across the bridge, from Berkeley to Fremont",
  "South Bay": "Silicon Valley and San Jose",
};

export default function CitySelector({ regions, cities }: Props) {
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return regions
      .map((region) => ({
        region,
        cities: cities.filter((c) => c.region === region && c.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.cities.length > 0);
  }, [regions, cities, filter]);

  return (
    <section className="city-selector" aria-labelledby="city-selector-title">
      <div className="city-selector__head">
        <h2 id="city-selector-title">Pick a city</h2>
        <input
          type="search"
          className="input"
          placeholder="Filter cities…"
          aria-label="Filter cities"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {grouped.length === 0 && <p className="muted">No cities match “{filter}”.</p>}

      <div className="regions">
        {grouped.map(({ region, cities }) => (
          <div className="region" key={region}>
            <h3 className="region__title">{region}</h3>
            {REGION_BLURBS[region] && <p className="region__blurb">{REGION_BLURBS[region]}</p>}
            <ul className="city-list">
              {cities.map((city) => (
                <li key={city.id}>
                  <Link className="city-chip" to={`/city/${city.id}`}>
                    {city.name}
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
