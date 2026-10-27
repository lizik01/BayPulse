import { forwardRef } from "react";
import { Link } from "react-router-dom";
import type { Event } from "../types/event";
import { formatEventWhen, formatPrice } from "../utils/dateUtils";

interface Props {
  event: Event;
  selected: boolean;
  onSelect: (id: string) => void;
}

const EventCard = forwardRef<HTMLElement, Props>(function EventCard({ event, selected, onSelect }, ref) {
  const price = formatPrice(event.priceRange);
  const onMap = event.venue?.lat != null && event.venue?.lng != null;

  return (
    <article
      ref={ref}
      className={`event-card ${selected ? "event-card--selected" : ""}`}
      onClick={() => onSelect(event.id)}
    >
      <div className="event-card__media">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="event-card__placeholder" aria-hidden="true">
            {event.category ?? "Event"}
          </div>
        )}
        {event.status && event.status !== "onsale" && (
          <span className={`badge badge--${event.status}`}>{statusLabel(event.status)}</span>
        )}
      </div>
      <div className="event-card__body">
        <p className="event-card__when">{formatEventWhen(event)}</p>
        <h3 className="event-card__title">
          <Link to={`/events/${event.id}`} onClick={(e) => e.stopPropagation()}>
            {event.name}
          </Link>
        </h3>
        <p className="event-card__venue">
          {event.venue ? `${event.venue.name}${event.venue.city ? `, ${event.venue.city}` : ""}` : "Venue TBA"}
          {!onMap && <span className="muted"> · not on map</span>}
        </p>
        <div className="event-card__meta">
          {event.genre && <span className="tag">{event.genre}</span>}
          {!event.genre && event.category && <span className="tag">{event.category}</span>}
          {price && <span className="event-card__price">{price}</span>}
        </div>
      </div>
    </article>
  );
});

export function statusLabel(status: string): string {
  return (
    { offsale: "Off sale", cancelled: "Cancelled", postponed: "Postponed", rescheduled: "Rescheduled" }[status] ??
    status
  );
}

export default EventCard;
