import "./TicketCard.css";

/**
 * Renders content in a torn-ticket shape: a narrow "stub" with the
 * record number, separated from the body by a perforated edge.
 * Used for job orders and invoices throughout the app.
 */
export default function TicketCard({ stub, children, onClick, accent }) {
  return (
    <div
      className={"ticket" + (onClick ? " ticket--clickable" : "")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      <div className={"ticket__stub" + (accent ? ` ticket__stub--${accent}` : "")}>
        {stub}
      </div>
      <div className="ticket__perforation" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="ticket__hole" />
        ))}
      </div>
      <div className="ticket__body">{children}</div>
    </div>
  );
}
