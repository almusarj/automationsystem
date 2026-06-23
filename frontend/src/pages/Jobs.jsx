import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { jobsApi, vehiclesApi } from "../api/resources";
import { PageHeader, Button, Field, EmptyState, Spinner, ErrorBanner } from "../components/ui";
import { JobStatusBadge, PriorityBadge } from "../components/StatusBadge";
import TicketCard from "../components/TicketCard";
import Modal from "../components/Modal";
import "./ListPages.css";
import "./Jobs.css";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "invoiced", label: "Invoiced" },
];

const STUB_ACCENT = {
  open: undefined,
  in_progress: "amber",
  on_hold: "rust",
  completed: "sage",
  invoiced: undefined,
};

const EMPTY_FORM = {
  vehicle: "",
  description: "",
  diagnosis: "",
  assigned_mechanic: "",
  status: "open",
  priority: "normal",
  labor_cost: "0",
  parts_cost: "0",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value || 0
  );
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load(params = {}) {
    setLoading(true);
    jobsApi
      .list(params)
      .then(({ data }) => setJobs(data.results ?? data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    vehiclesApi.list({ page_size: 500 }).then(({ data }) => setVehicles(data.results ?? data));
  }, []);

  useEffect(() => {
    load(statusFilter ? { status: statusFilter } : {});
  }, [statusFilter]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setModalOpen(true);
  }

  function openEdit(job) {
    setForm({
      vehicle: job.vehicle,
      description: job.description,
      diagnosis: job.diagnosis,
      assigned_mechanic: job.assigned_mechanic,
      status: job.status,
      priority: job.priority,
      labor_cost: job.labor_cost,
      parts_cost: job.parts_cost,
    });
    setEditingId(job.id);
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await jobsApi.update(editingId, form);
      } else {
        await jobsApi.create(form);
      }
      setModalOpen(false);
      load(statusFilter ? { status: statusFilter } : {});
    } catch {
      setError("Couldn't save this job order. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Job orders"
        subtitle="Every repair ticket, from intake to invoice."
        action={
          <Button variant="accent" onClick={openCreate} disabled={vehicles.length === 0}>
            <Plus size={16} /> New job order
          </Button>
        }
      />

      <div className="list-toolbar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : jobs.length === 0 ? (
        <EmptyState
          title={vehicles.length === 0 ? "Add a vehicle first" : "No job orders yet"}
          description={
            vehicles.length === 0
              ? "Job orders are tied to a vehicle — register one before opening a ticket."
              : "Open a job order when a vehicle comes in for service."
          }
          action={
            vehicles.length > 0 && (
              <Button variant="accent" onClick={openCreate}>
                <Plus size={16} /> New job order
              </Button>
            )
          }
        />
      ) : (
        <div className="ticket-list">
          {jobs.map((job) => (
            <TicketCard
              key={job.id}
              accent={STUB_ACCENT[job.status]}
              onClick={() => openEdit(job)}
              stub={
                <>
                  <span>{job.job_number.replace("JOB-", "")}</span>
                </>
              }
            >
              <div className="job-ticket__top">
                <span className="job-ticket__desc">{job.description}</span>
                <div className="job-ticket__badges">
                  <PriorityBadge priority={job.priority} />
                  <JobStatusBadge status={job.status} />
                </div>
              </div>
              <div className="job-ticket__meta">
                <span>{job.vehicle_display}</span>
                <span>·</span>
                <span>{job.customer_name}</span>
                {job.assigned_mechanic && (
                  <>
                    <span>·</span>
                    <span>{job.assigned_mechanic}</span>
                  </>
                )}
              </div>
              <div className="job-ticket__footer">
                <span className="job-ticket__cost">{formatCurrency(job.total_cost)}</span>
                {job.has_invoice && <span className="job-ticket__invoiced">Invoiced</span>}
              </div>
            </TicketCard>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId ? "Edit job order" : "New job order"}
          onClose={() => setModalOpen(false)}
          width="560px"
        >
          <form onSubmit={handleSubmit} className="modal-form">
            <ErrorBanner message={error} />
            <Field label="Vehicle">
              <select
                required
                value={form.vehicle}
                onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
              >
                <option value="" disabled>
                  Select a vehicle
                </option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model} — {v.license_plate} ({v.customer_name})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="What the customer reported">
              <textarea
                required
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Diagnosis" hint="Optional — fill in once inspected">
              <textarea
                rows={2}
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              />
            </Field>
            <div className="modal-form__row">
              <Field label="Assigned mechanic" hint="Optional">
                <input
                  value={form.assigned_mechanic}
                  onChange={(e) => setForm({ ...form, assigned_mechanic: e.target.value })}
                />
              </Field>
              <Field label="Priority">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </Field>
            </div>
            <div className="modal-form__row">
              <Field label="Labor cost">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.labor_cost}
                  onChange={(e) => setForm({ ...form, labor_cost: e.target.value })}
                />
              </Field>
              <Field label="Parts cost">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.parts_cost}
                  onChange={(e) => setForm({ ...form, parts_cost: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="on_hold">On hold</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
            <div className="modal-form__actions">
              <Button type="submit" variant="accent" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create job order"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
