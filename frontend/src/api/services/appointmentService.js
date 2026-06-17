import api from "../axiosInstance";

const ENDPOINT = "/appointments";

const appointmentService = {
  /**
   * Get paginated list of appointments
   */
  getAll: (page = 1, limit = 20, filters = {}) =>
    api
      .get(ENDPOINT, {
        params: { page, limit, sortBy: "appointmentId", sortOrder: "DESC", ...filters },
      })
      .then((res) => res.data),

  /**
   * Search appointments by name / doctor / reason
   */
  search: (query) =>
    api.get(ENDPOINT, { params: { search: query } }).then((res) => res.data),

  /**
   * Get single appointment by ID
   */
  getById: (id) => api.get(`${ENDPOINT}/${id}`).then((res) => res.data),

  /**
   * Create a new appointment
   */
  create: (data) => api.post(ENDPOINT, data).then((res) => res.data),

  /**
   * Update an existing appointment
   */
  update: (id, data) =>
    api.patch(`${ENDPOINT}/${id}`, data).then((res) => res.data),

  /**
   * Soft-delete an appointment
   */
  delete: (id) => api.delete(`${ENDPOINT}/${id}`).then((res) => res.data),
};

export default appointmentService;
