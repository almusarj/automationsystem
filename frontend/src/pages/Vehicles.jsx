import { useEffect, useState } from "react";
import { Plus, Search, ChevronRight } from "lucide-react";
import { vehiclesApi, customersApi } from "../api/resources";
import { PageHeader, Button, Field, EmptyState, Spinner, ErrorBanner } from "../components/ui";
import Modal from "../components/Modal";
import "./ListPages.css";

const EMPTY_FORM = {
  customer: "",
  make: "",
  model: "",
  year: "",
  license_plate: "",
  vin: "",
  color: "",
  odometer: "",
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
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
    vehiclesApi
      .list(params)
      .then(({ data }) => setVehicles(data.results ?? data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    customersApi.list({ page_size: 500 }).then(({ data }) => setCustomers(data.results ?? data));
  }, []);

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

  function openEdit(vehicle) {
    setForm({
      customer: vehicle.customer,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      license_plate: vehicle.license_plate,
      vin: vehicle.vin,
      color: vehicle.color,
      odometer: vehicle.odometer,
    });
    setEditingId(vehicle.id);
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, year: Number(form.year), odometer: Number(form.odometer) || 0 };
      if (editingId) {
        await vehiclesApi.update(editingId, payload);
      } else {
        await vehiclesApi.create(payload);
      }
      setModalOpen(false);
      load(search ? { search } : {});
    } catch {
      setError("Couldn't save this vehicle. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="Every car, truck, and bike that's come through the bay."
        action={
          <Button variant="accent" onClick={openCreate} disabled={customers.length === 0}>
            <Plus size={16} /> Add vehicle
          </Button>
        }
      />

      <div className="list-toolbar">
        <div className="list-toolbar__search">
          <Search size={16} />
          <input
            placeholder="Search by make, model, or plate"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title={customers.length === 0 ? "Add a customer first" : "No vehicles yet"}
          description={
            customers.length === 0
              ? "Vehicles belong to customers — add a customer before registering their car."
              : "Add a vehicle to start opening job orders for it."
          }
          action={
            customers.length > 0 && (
              <Button variant="accent" onClick={openCreate}>
                <Plus size={16} /> Add vehicle
              </Button>
            )
          }
        />
      ) : (
        <div className="data-list">
          {vehicles.map((v) => (
            <div key={v.id} className="data-row" onClick={() => openEdit(v)}>
              <div className="data-row__main">
                <span className="data-row__title">
                  {v.year} {v.make} {v.model}
                </span>
                <span className="data-row__meta">{v.customer_name}</span>
              </div>
              <span className="data-row__tag" style={{ fontFamily: "var(--font-mono)" }}>
                {v.license_plate}
              </span>
              <ChevronRight size={16} className="data-row__chevron" />
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId ? "Edit vehicle" : "Add vehicle"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="modal-form">
            <ErrorBanner message={error} />
            <Field label="Customer">
              <select
                required
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
              >
                <option value="" disabled>
                  Select a customer
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="modal-form__row">
              <Field label="Make">
                <input
                  required
                  value={form.make}
                  onChange={(e) => setForm({ ...form, make: e.target.value })}
                />
              </Field>
              <Field label="Model">
                <input
                  required
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </Field>
            </div>
            <div className="modal-form__row">
              <Field label="Year">
                <input
                  type="number"
                  required
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
              </Field>
              <Field label="License plate">
                <input
                  required
                  value={form.license_plate}
                  onChange={(e) => setForm({ ...form, license_plate: e.target.value })}
                />
              </Field>
            </div>
            <div className="modal-form__row">
              <Field label="VIN" hint="Optional">
                <input
                  value={form.vin}
                  onChange={(e) => setForm({ ...form, vin: e.target.value })}
                />
              </Field>
              <Field label="Color" hint="Optional">
                <input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Odometer" hint="Optional">
              <input
                type="number"
                value={form.odometer}
                onChange={(e) => setForm({ ...form, odometer: e.target.value })}
              />
            </Field>
            <div className="modal-form__actions">
              <Button type="submit" variant="accent" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Add vehicle"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
