import { useCallback, useEffect, useState } from "react";
import CitySelector from "../components/CitySelector";
import StatusMessage from "../components/StatusMessage";
import { errorMessage, getCityDirectory } from "../services/eventService";
import type { CityDirectory } from "../types/city";

export default function HomePage() {
  const [directory, setDirectory] = useState<CityDirectory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getCityDirectory()
      .then(setDirectory)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(load, [load]);

  return (
    <>
      <section className="hero">
        <p className="hero__eyebrow">San Francisco Bay Area</p>
        <h1 className="hero__title">
          What's happening,
          <br />
          one city at a time.
        </h1>
        <p className="hero__lede">
          Concerts, games, theatre and festivals from San Francisco to San Jose. Choose a city to see what's
          coming up, then explore it on the map.
        </p>
      </section>

      {error && <StatusMessage tone="error" title="Couldn't load cities" action={{ label: "Try again", onClick: load }}>{error}</StatusMessage>}
      {!error && !directory && <p className="muted center">Loading cities…</p>}
      {directory && <CitySelector regions={directory.regions} cities={directory.cities} />}
    </>
  );
}
