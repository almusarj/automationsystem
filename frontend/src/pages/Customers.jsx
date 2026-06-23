import { useEffect, useState } from "react";
import { Plus, Search, ChevronRight } from "lucide-react";
import { customersApi } from "../api/resources";
import { PageHeader, Button, Field, EmptyState, Spinner, ErrorBanner } from "../components/ui";
import Modal from "../components/Modal";
import "./ListPages.css";

const EMPTY_FORM = { full_name: "", phone: "", email: "", address: "", notes: "" };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load(params = {}) {
    setLoading(true);
    customersApi
      .list(params)
      .then(({ data }) => setCustomers(data.results ?? data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const handle = setTimeout(() => load(search ? { search } : {}), 300);
    return () => clearTimeout(handle);
  }, [search]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setModalOpen(true);
  }

  function openEdit(customer) {
    setForm({
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
    });
    setEditingId(customer.id);
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await customersApi.update(editingId, form);
      } else {
        await customersApi.create(form);
      }
      setModalOpen(false);
      load(search ? { search } : {});
    } catch {
      setError("Couldn't save this customer. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Everyone with a vehicle in your shop."
        action={
          <Button variant="accent" onClick={openCreate}>
            <Plus size={16} /> Add customer
          </Button>
        }
      />

      <div className="list-toolbar">
        <div className="list-toolbar__search">
          <Search size={16} />
          <input
            placeholder="Search by name, phone, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add your first customer to start tracking their vehicles and jobs."
          action={
            <Button variant="accent" onClick={openCreate}>
              <Plus size={16} /> Add customer
            </Button>
          }
        />
      ) : (
        <div className="data-list">
          {customers.map((c) => (
            <div key={c.id} className="data-row" onClick={() => openEdit(c)}>
              <div className="data-row__main">
                <span className="data-row__title">{c.full_name}</span>
                <span className="data-row__meta">
                  {c.phone}
                  {c.email && ` · ${c.email}`}
                </span>
              </div>
              <span className="data-row__tag">
                {c.vehicle_count} {c.vehicle_count === 1 ? "vehicle" : "vehicles"}
              </span>
              <ChevronRight size={16} className="data-row__chevron" />
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId ? "Edit customer" : "Add customer"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="modal-form">
            <ErrorBanner message={error} />
            <Field label="Full name">
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Email" hint="Optional">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Address" hint="Optional">
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <Field label="Notes" hint="Optional">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <div className="modal-form__actions">
              <Button type="submit" variant="accent" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Add customer"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
