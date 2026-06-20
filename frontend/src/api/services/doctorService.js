import api from "../axiosInstance";

const ENDPOINT = "/doctors";

const doctorService = {
  getAll: (page = 1, limit = 20) =>
    api
      .get(ENDPOINT, {
        params: { page, limit, sortBy: "doctorId", sortOrder: "ASC" },
      })
      .then((res) => res.data),

  search: (query) =>
    api.get(ENDPOINT, { params: { search: query } }).then((res) => res.data),

  getById: (id) => api.get(`${ENDPOINT}/${id}`).then((res) => res.data),

  getSchedule: (id, date) =>
    api
      .get(`${ENDPOINT}/${id}/schedule`, { params: date ? { date } : {} })
      .then((res) => res.data),

  create: (data) => api.post(ENDPOINT, data).then((res) => res.data),

  update: (id, data) =>
    api.patch(`${ENDPOINT}/${id}`, data).then((res) => res.data),

  delete: (id) => api.delete(`${ENDPOINT}/${id}`).then((res) => res.data),
};

export default doctorService;
