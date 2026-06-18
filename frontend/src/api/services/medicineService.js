import api from "../axiosInstance";

const ENDPOINT = "/medicines";

const medicineService = {
  /**
   * Get paginated list of medicines with stock info
   */
  getAll: (page = 1, limit = 20, params = {}) =>
    api
      .get(ENDPOINT, {
        params: { page, limit, sortBy: "medicineId", sortOrder: "ASC", ...params },
      })
      .then((res) => res.data),

  /**
   * Search medicines by name or category
   */
  search: (query) =>
    api.get(ENDPOINT, { params: { search: query } }).then((res) => res.data),

  /**
   * Get single medicine by ID (includes stock, batches, logs)
   */
  getById: (id) => api.get(`${ENDPOINT}/${id}`).then((res) => res.data),

  /**
   * Get dashboard stats
   */
  getStats: () => api.get(`${ENDPOINT}/stats`).then((res) => res.data),

  /**
   * Create a new medicine
   */
  create: (data) => api.post(ENDPOINT, data).then((res) => res.data),

  /**
   * Update an existing medicine
   */
  update: (id, data) =>
    api.patch(`${ENDPOINT}/${id}`, data).then((res) => res.data),

  /**
   * Delete a medicine
   */
  delete: (id) => api.delete(`${ENDPOINT}/${id}`).then((res) => res.data),

  /**
   * Adjust stock (IN/OUT)
   */
  adjustStock: (id, data) =>
    api.post(`${ENDPOINT}/${id}/stock`, data).then((res) => res.data),

  /**
   * Get inventory log for a medicine
   */
  getInventoryLog: (id, page = 1, limit = 20) =>
    api
      .get(`${ENDPOINT}/${id}/log`, { params: { page, limit } })
      .then((res) => res.data),
};

export default medicineService;
