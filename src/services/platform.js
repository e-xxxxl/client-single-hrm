import { api } from "./api.js";

/** Platform console endpoints — only the Platform Admin can call these. */
export const platform = {
  overview: () => api.get("/platform/overview").then((r) => r.data.data),
  organizations: (params) => api.get("/platform/organizations", { params }).then((r) => r.data),
  organization: (id) => api.get(`/platform/organizations/${id}`).then((r) => r.data.data),
  createOrganization: (body) =>
    api
      .post("/platform/organizations", body)
      .then((r) => ({ ...r.data.data, tempPassword: r.data.meta?.tempPassword ?? null })),
  updateOrganization: (id, body) => api.patch(`/platform/organizations/${id}`, body).then((r) => r.data.data),
  setOrganizationStatus: (id, status, reason) =>
    api.patch(`/platform/organizations/${id}/status`, { status, reason: reason || undefined }).then((r) => r.data.data),
  addAdmin: (id, body) =>
    api
      .post(`/platform/organizations/${id}/admins`, body)
      .then((r) => ({ admin: r.data.data, tempPassword: r.data.meta?.tempPassword ?? null })),
  setAdminStatus: (id, userId, status) =>
    api.patch(`/platform/organizations/${id}/admins/${userId}/status`, { status }).then((r) => r.data.data),
  resetAdminPassword: (id, userId) =>
    api.post(`/platform/organizations/${id}/admins/${userId}/reset-password`).then((r) => r.data.data.tempPassword),
  settings: () => api.get("/platform/settings").then((r) => r.data.data),
  updateSettings: (body) => api.patch("/platform/settings", body).then((r) => r.data.data),
  audit: (params) => api.get("/platform/audit", { params }).then((r) => r.data),
};

export default platform;
