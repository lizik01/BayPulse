import type { ReactNode } from "react";

interface Props {
  title: string;
  children?: ReactNode;
  tone?: "neutral" | "error";
  action?: { label: string; onClick: () => void };
}

export default function StatusMessage({ title, children, tone = "neutral", action }: Props) {
  return (
    <div className={`status status--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <p className="status__title">{title}</p>
      {children && <div className="status__body">{children}</div>}
      {action && (
        <button type="button" className="btn btn--primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

export function CardSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="event-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="event-card event-card--skeleton" key={i}>
          <div className="event-card__media shimmer" />
          <div className="event-card__body">
            <div className="shimmer line line--short" />
            <div className="shimmer line" />
            <div className="shimmer line line--mid" />
          </div>
        </div>
      ))}
    </div>
  );
}
