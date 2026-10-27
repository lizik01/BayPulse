import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { statusLabel } from "../components/EventCard";
import EventMap from "../components/EventMap";
import StatusMessage from "../components/StatusMessage";
import { errorMessage, getEvent } from "../services/eventService";
import type { Event } from "../types/event";
import { directionsUrl, formatAddress, formatEventWhen, formatPrice } from "../utils/dateUtils";

export default function EventDetailsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setEvent(null);
    setError(null);
    getEvent(id, controller.signal)
      .then((e) => {
        setEvent(e);
        document.title = `${e.name} · BayPulse`;
      })
      .catch((err) => {
        if (!axios.isCancel(err)) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, [id, retry]);

  const back = (
    <button type="button" className="back-link" onClick={() => (history.length > 1 ? navigate(-1) : navigate("/"))}>
      ← Back to results
    </button>
  );

  if (error) {
    return (
      <>
        {back}
        <StatusMessage tone="error" title="Couldn't load this event" action={{ label: "Retry", onClick: () => setRetry((n) => n + 1) }}>
          {error}
        </StatusMessage>
      </>
    );
  }

  if (!event) {
    return (
      <>
        {back}
        <p className="muted center">Loading event…</p>
      </>
    );
  }

  const v = event.venue;
  const price = formatPrice(event.priceRange);
  const address = v ? formatAddress(v) : null;
  const hasCoords = v?.lat != null && v?.lng != null;

  return (
    <article className="details">
      {back}

      <div className="details__hero">
        {event.imageUrl && <img src={event.imageUrl} alt="" className="details__image" />}
      </div>

      <div className="details__grid">
        <div className="details__main">
          <div className="details__tags">
            {event.category && <span className="tag">{event.category}</span>}
            {event.genre && <span className="tag">{event.genre}</span>}
            {event.status && event.status !== "onsale" && (
              <span className={`badge badge--${event.status}`}>{statusLabel(event.status)}</span>
            )}
          </div>
          <h1 className="details__title">{event.name}</h1>
          <p className="details__when">{formatEventWhen(event, true)}</p>

          {event.description && (
            <section>
              <h2>About</h2>
              <p className="details__text">{event.description}</p>
            </section>
          )}
          {event.pleaseNote && event.pleaseNote !== event.description && (
            <section>
              <h2>Please note</h2>
              <p className="details__text">{event.pleaseNote}</p>
            </section>
          )}
          {!event.description && !event.pleaseNote && (
            <p className="muted">Ticketmaster didn't provide a description for this event.</p>
          )}
        </div>

        <aside className="details__side">
          <div className="panel">
            {price ? (
              <p className="details__price">
                <span className="muted">Tickets</span> {price}
              </p>
            ) : (
              <p className="muted">Price not listed</p>
            )}
            {event.url ? (
              <a className="btn btn--primary btn--block" href={event.url} target="_blank" rel="noopener noreferrer">
                Get tickets on Ticketmaster ↗
              </a>
            ) : (
              <p className="muted">No ticket link available.</p>
            )}
          </div>

          <div className="panel">
            <h2>Venue</h2>
            {v ? (
              <>
                <p className="details__venue">{v.name}</p>
                {address && <p className="muted">{address}</p>}
                <a className="btn btn--ghost btn--block" href={directionsUrl(v)} target="_blank" rel="noopener noreferrer">
                  Directions in Google Maps ↗
                </a>
              </>
            ) : (
              <p className="muted">Venue to be announced.</p>
            )}
          </div>

          {hasCoords && (
            <EventMap
              className="event-map--small"
              center={[v!.lat!, v!.lng!]}
              zoom={15}
              events={[event]}
              selectedId={null}
              onSelect={() => {}}
            />
          )}
        </aside>
      </div>

      <p className="attribution">
        Event data from Ticketmaster. <Link to="/">Browse other cities</Link>.
      </p>
    </article>
  );
}
