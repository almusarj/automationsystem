import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Car, Wrench, AlertCircle } from "lucide-react";
import { dashboardApi } from "../api/resources";
import { PageHeader, Spinner, EmptyState } from "../components/ui";
import { JobStatusBadge } from "../components/StatusBadge";
import "./Dashboard.css";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value || 0
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .get()
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats) return null;

  const statCards = [
    { label: "Customers", value: stats.total_customers, icon: Users, to: "/customers" },
    { label: "Vehicles", value: stats.total_vehicles, icon: Car, to: "/vehicles" },
    { label: "Open jobs", value: stats.open_jobs, icon: Wrench, to: "/jobs" },
    {
      label: "Outstanding balance",
      value: formatCurrency(stats.outstanding_balance),
      icon: AlertCircle,
      to: "/invoices",
      tone: stats.outstanding_balance > 0 ? "rust" : undefined,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="What's on the lift, what's overdue, what's owed."
      />

      <div className="stat-grid">
        {statCards.map(({ label, value, icon: Icon, to, tone }) => (
          <Link key={label} to={to} className={`stat-card ${tone ? `stat-card--${tone}` : ""}`}>
            <Icon size={18} strokeWidth={2} className="stat-card__icon" />
            <div className="stat-card__value">{value}</div>
            <div className="stat-card__label">{label}</div>
          </Link>
        ))}
      </div>

      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Recent job orders</h2>
        {stats.recent_jobs.length === 0 ? (
          <EmptyState
            title="No job orders yet"
            description="Once you create a job order, it'll show up here."
          />
        ) : (
          <div className="recent-jobs">
            {stats.recent_jobs.map((job) => (
              <Link to="/jobs" key={job.id} className="recent-job-row">
                <span className="recent-job-row__number">{job.job_number}</span>
                <span className="recent-job-row__desc">{job.description}</span>
                <span className="recent-job-row__vehicle">{job.vehicle_display}</span>
                <JobStatusBadge status={job.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
