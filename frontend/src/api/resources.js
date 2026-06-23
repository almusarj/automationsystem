import client from "./client";

export const customersApi = {
  list: (params) => client.get("/customers/", { params }),
  get: (id) => client.get(`/customers/${id}/`),
  create: (data) => client.post("/customers/", data),
  update: (id, data) => client.patch(`/customers/${id}/`, data),
  remove: (id) => client.delete(`/customers/${id}/`),
};

export const vehiclesApi = {
  list: (params) => client.get("/vehicles/", { params }),
  get: (id) => client.get(`/vehicles/${id}/`),
  create: (data) => client.post("/vehicles/", data),
  update: (id, data) => client.patch(`/vehicles/${id}/`, data),
  remove: (id) => client.delete(`/vehicles/${id}/`),
};

export const jobsApi = {
  list: (params) => client.get("/jobs/", { params }),
  get: (id) => client.get(`/jobs/${id}/`),
  create: (data) => client.post("/jobs/", data),
  update: (id, data) => client.patch(`/jobs/${id}/`, data),
  remove: (id) => client.delete(`/jobs/${id}/`),
};

export const invoicesApi = {
  list: (params) => client.get("/invoices/", { params }),
  get: (id) => client.get(`/invoices/${id}/`),
  create: (data) => client.post("/invoices/", data),
  update: (id, data) => client.patch(`/invoices/${id}/`, data),
  remove: (id) => client.delete(`/invoices/${id}/`),
  recordPayment: (id, amount) =>
    client.post(`/invoices/${id}/record_payment/`, { amount }),
};

export const dashboardApi = {
  get: () => client.get("/dashboard/"),
};
