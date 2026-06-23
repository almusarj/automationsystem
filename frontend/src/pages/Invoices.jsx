import { useEffect, useState } from "react";
import { Plus, DollarSign } from "lucide-react";
import { invoicesApi, jobsApi } from "../api/resources";
import { PageHeader, Button, Field, EmptyState, Spinner, ErrorBanner } from "../components/ui";
import { InvoiceStatusBadge } from "../components/StatusBadge";
import TicketCard from "../components/TicketCard";
import Modal from "../components/Modal";
import "./ListPages.css";
import "./Jobs.css";
import "./Invoices.css";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Paid" },
];

const STUB_ACCENT = { unpaid: "rust", partial: "amber", paid: "sage" };

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value || 0
  );
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ job_order: "", tax_rate: "0" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [payModal, setPayModal] = useState(null); // invoice object or null
  const [payAmount, setPayAmount] = useState("");
  const [payError, setPayError] = useState("");
  const [payingSubmit, setPayingSubmit] = useState(false);

  function load(params = {}) {
    setLoading(true);
    invoicesApi
      .list(params)
      .then(({ data }) => setInvoices(data.results ?? data))
      .finally(() => setLoading(false));
  }

  function loadInvoiceableJobs() {
    jobsApi.list({ status: "completed", page_size: 500 }).then(({ data }) =>
      setCompletedJobs((data.results ?? data).filter((j) => !j.has_invoice))
    );
  }

  useEffect(() => {
    loadInvoiceableJobs();
  }, []);

  useEffect(() => {
    load(statusFilter ? { status: statusFilter } : {});
  }, [statusFilter]);

  function openCreate() {
    setNewInvoice({ job_order: "", tax_rate: "0" });
    setError("");
    setCreateOpen(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await invoicesApi.create(newInvoice);
      setCreateOpen(false);
      load(statusFilter ? { status: statusFilter } : {});
      loadInvoiceableJobs();
    } catch {
      setError("Couldn't create this invoice. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  function openPayment(invoice) {
    setPayModal(invoice);
    setPayAmount("");
    setPayError("");
  }

  async function handlePayment(e) {
    e.preventDefault();
    setPayingSubmit(true);
    setPayError("");
    try {
      await invoicesApi.recordPayment(payModal.id, payAmount);
      setPayModal(null);
      load(statusFilter ? { status: statusFilter } : {});
    } catch (err) {
      setPayError(
        err.response?.data?.detail || "Couldn't record this payment. Try a different amount."
      );
    } finally {
      setPayingSubmit(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Bill completed work and track what's still owed."
        action={
          <Button variant="accent" onClick={openCreate} disabled={completedJobs.length === 0}>
            <Plus size={16} /> New invoice
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
      ) : invoices.length === 0 ? (
        <EmptyState
          title={completedJobs.length === 0 ? "No completed jobs ready to bill" : "No invoices yet"}
          description={
            completedJobs.length === 0
              ? "Mark a job order as completed, then come back here to invoice it."
              : "Turn a completed job order into an invoice."
          }
          action={
            completedJobs.length > 0 && (
              <Button variant="accent" onClick={openCreate}>
                <Plus size={16} /> New invoice
              </Button>
            )
          }
        />
      ) : (
        <div className="ticket-list">
          {invoices.map((inv) => (
            <TicketCard
              key={inv.id}
              accent={STUB_ACCENT[inv.status]}
              stub={<span>{inv.invoice_number.replace("INV-", "")}</span>}
            >
              <div className="job-ticket__top">
                <span className="job-ticket__desc">{inv.vehicle_display}</span>
                <InvoiceStatusBadge status={inv.status} />
              </div>
              <div className="job-ticket__meta">
                <span>{inv.customer_name}</span>
                <span>·</span>
                <span>{inv.job_number}</span>
              </div>
              <div className="invoice-ticket__amounts">
                <div>
                  <span className="invoice-ticket__amount-label">Total</span>
                  <span className="invoice-ticket__amount-value">{formatCurrency(inv.total)}</span>
                </div>
                <div>
                  <span className="invoice-ticket__amount-label">Paid</span>
                  <span className="invoice-ticket__amount-value">
                    {formatCurrency(inv.amount_paid)}
                  </span>
                </div>
                <div>
                  <span className="invoice-ticket__amount-label">Balance due</span>
                  <span
                    className="invoice-ticket__amount-value"
                    style={inv.balance_due > 0 ? { color: "var(--rust)" } : undefined}
                  >
                    {formatCurrency(inv.balance_due)}
                  </span>
                </div>
              </div>
              {inv.status !== "paid" && (
                <div className="job-ticket__footer">
                  <Button variant="ghost" onClick={() => openPayment(inv)}>
                    <DollarSign size={14} /> Record payment
                  </Button>
                </div>
              )}
            </TicketCard>
          ))}
        </div>
      )}

      {createOpen && (
        <Modal title="New invoice" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="modal-form">
            <ErrorBanner message={error} />
            <Field label="Completed job order" hint="Only jobs without an invoice yet show up here">
              <select
                required
                value={newInvoice.job_order}
                onChange={(e) => setNewInvoice({ ...newInvoice, job_order: e.target.value })}
              >
                <option value="" disabled>
                  Select a job order
                </option>
                {completedJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.job_number} — {j.vehicle_display} ({j.customer_name})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tax rate" hint="Percentage, e.g. 8.5">
              <input
                type="number"
                step="0.01"
                min="0"
                value={newInvoice.tax_rate}
                onChange={(e) => setNewInvoice({ ...newInvoice, tax_rate: e.target.value })}
              />
            </Field>
            <div className="modal-form__actions">
              <Button type="submit" variant="accent" disabled={saving}>
                {saving ? "Creating…" : "Create invoice"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {payModal && (
        <Modal title={`Record payment — ${payModal.invoice_number}`} onClose={() => setPayModal(null)}>
          <form onSubmit={handlePayment} className="modal-form">
            <ErrorBanner message={payError} />
            <p className="invoice-ticket__balance-note">
              Balance due: <strong>{formatCurrency(payModal.balance_due)}</strong>
            </p>
            <Field label="Payment amount">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </Field>
            <div className="modal-form__actions">
              <Button type="submit" variant="accent" disabled={payingSubmit}>
                {payingSubmit ? "Recording…" : "Record payment"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
