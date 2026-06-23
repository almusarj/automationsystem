import "./StatusBadge.css";

const JOB_STATUS_CONFIG = {
  open: { label: "Open", tone: "neutral" },
  in_progress: { label: "In progress", tone: "amber" },
  on_hold: { label: "On hold", tone: "rust" },
  completed: { label: "Completed", tone: "sage" },
  invoiced: { label: "Invoiced", tone: "ink" },
};

const INVOICE_STATUS_CONFIG = {
  unpaid: { label: "Unpaid", tone: "rust" },
  partial: { label: "Partially paid", tone: "amber" },
  paid: { label: "Paid", tone: "sage" },
};

const PRIORITY_CONFIG = {
  low: { label: "Low priority", tone: "neutral" },
  normal: { label: "Normal priority", tone: "neutral" },
  high: { label: "High priority", tone: "rust" },
};

function Badge({ label, tone }) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}

export function JobStatusBadge({ status }) {
  const cfg = JOB_STATUS_CONFIG[status] || { label: status, tone: "neutral" };
  return <Badge {...cfg} />;
}

export function InvoiceStatusBadge({ status }) {
  const cfg = INVOICE_STATUS_CONFIG[status] || { label: status, tone: "neutral" };
  return <Badge {...cfg} />;
}

export function PriorityBadge({ priority }) {
  if (priority === "normal") return null;
  const cfg = PRIORITY_CONFIG[priority] || { label: priority, tone: "neutral" };
  return <Badge {...cfg} />;
}
