import api from "../axiosInstance";

const ENDPOINT = "/patients";

const patientService = {
  /**
   * Get paginated list of patients
   */
  getAll: (page = 1, limit = 20) =>
    api
      .get(ENDPOINT, {
        params: { page, limit, sortBy: "patientId", sortOrder: "ASC" },
      })
      .then((res) => res.data),

  /**
   * Search patients by name
   */
  search: (query) =>
    api.get(ENDPOINT, { params: { search: query } }).then((res) => res.data),

  procedureSearch: (query) =>
    api
      .get(`${ENDPOINT}/search/procedure`, { params: { q: query } })
      .then((res) => res.data),

  /**
   * Get single patient by ID
   */
  getById: (id) => api.get(`${ENDPOINT}/${id}`).then((res) => res.data),

  getVisitHistory: (id) =>
    api.get(`${ENDPOINT}/${id}/visit-history`).then((res) => res.data),

  /**
   * Create a new patient
   */
  create: (data) => api.post(ENDPOINT, data).then((res) => res.data),

  /**
   * Update an existing patient
   */
  update: (id, data) =>
    api.patch(`${ENDPOINT}/${id}`, data).then((res) => res.data),

  /**
   * Delete a patient
   */
  delete: (id) => api.delete(`${ENDPOINT}/${id}`).then((res) => res.data),

  /**
   * Get patient aggregate stats for the dashboard
   */
  getStats: () => api.get(`${ENDPOINT}/stats`).then((res) => res.data),
};

export default patientService;
