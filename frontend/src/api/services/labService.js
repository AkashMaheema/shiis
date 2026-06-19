import api from "../axiosInstance";

const ROOT = "/lab";

const labService = {
  // ── Stats ────────────────────────────────────────────────────────────
  getStats: () => api.get(`${ROOT}/stats`).then((r) => r.data),

  // ── Doctor lookup (helper from Lab module) ───────────────────────────
  getDoctors: () => api.get(`${ROOT}/doctors`).then((r) => r.data),

  // ── Patient lookup (helper from Lab module — bypasses Patient module) ─
  getPatients: () => api.get(`${ROOT}/patients`).then((r) => r.data),

  // ── Lab Test catalog ────────────────────────────────────────────────
  getTests: (search) =>
    api
      .get(`${ROOT}/tests`, { params: search ? { search } : {} })
      .then((r) => r.data),
  getTest: (id) => api.get(`${ROOT}/tests/${id}`).then((r) => r.data),
  createTest: (data) => api.post(`${ROOT}/tests`, data).then((r) => r.data),
  updateTest: (id, data) =>
    api.patch(`${ROOT}/tests/${id}`, data).then((r) => r.data),
  deleteTest: (id) => api.delete(`${ROOT}/tests/${id}`).then((r) => r.data),

  // ── Lab Requests ────────────────────────────────────────────────────
  getRequests: (page = 1, limit = 20, filters = {}) =>
    api
      .get(`${ROOT}/requests`, {
        params: {
          page,
          limit,
          sortBy: "requestId",
          sortOrder: "DESC",
          ...filters,
        },
      })
      .then((r) => r.data),
  getRequest: (id) => api.get(`${ROOT}/requests/${id}`).then((r) => r.data),
  createRequest: (data) =>
    api.post(`${ROOT}/requests`, data).then((r) => r.data),
  updateRequest: (id, data) =>
    api.patch(`${ROOT}/requests/${id}`, data).then((r) => r.data),
  deleteRequest: (id) =>
    api.delete(`${ROOT}/requests/${id}`).then((r) => r.data),

  // ── Lab Results ─────────────────────────────────────────────────────
  saveResult: (requestId, data) =>
    api.post(`${ROOT}/requests/${requestId}/result`, data).then((r) => r.data),
  updateResult: (resultId, data) =>
    api.patch(`${ROOT}/results/${resultId}`, data).then((r) => r.data),
  deleteResult: (resultId) =>
    api.delete(`${ROOT}/results/${resultId}`).then((r) => r.data),
};

export default labService;
