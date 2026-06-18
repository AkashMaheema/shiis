import api from "../axiosInstance";

const ROOT = "/prescriptions";

const prescriptionService = {
  getAll: (page = 1, limit = 20, filters = {}) =>
    api
      .get(ROOT, {
        params: {
          page,
          limit,
          sortBy: "prescriptionId",
          sortOrder: "DESC",
          ...filters,
        },
      })
      .then((r) => r.data),

  getById: (id) => api.get(`${ROOT}/${id}`).then((r) => r.data),
  create: (data) => api.post(ROOT, data).then((r) => r.data),
  update: (id, data) => api.patch(`${ROOT}/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`${ROOT}/${id}`).then((r) => r.data),
  getStats: () => api.get(`${ROOT}/stats`).then((r) => r.data),
  getPatients: () => api.get(`${ROOT}/patients`).then((r) => r.data),
  getAppointments: () => api.get(`${ROOT}/appointments`).then((r) => r.data),
  getMedicines: (search) =>
    api
      .get(`${ROOT}/medicines`, { params: search ? { search } : {} })
      .then((r) => r.data),
};

export default prescriptionService;
