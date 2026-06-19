import api from "../axiosInstance";

const ENDPOINT = "/suppliers";

const supplierService = {
  /**
   * Get paginated list of suppliers
   */
  getAll: (page = 1, limit = 20) =>
    api
      .get(ENDPOINT, {
        params: { page, limit, sortBy: "supplierId", sortOrder: "ASC" },
      })
      .then((res) => res.data),

  /**
   * Search suppliers by name, contact person, email or phone
   */
  search: (query) =>
    api.get(ENDPOINT, { params: { search: query } }).then((res) => res.data),

  /**
   * Get single supplier by ID
   */
  getById: (id) => api.get(`${ENDPOINT}/${id}`).then((res) => res.data),

  /**
   * Create a new supplier
   */
  create: (data) => api.post(ENDPOINT, data).then((res) => res.data),

  /**
   * Update an existing supplier
   */
  update: (id, data) =>
    api.patch(`${ENDPOINT}/${id}`, data).then((res) => res.data),

  /**
   * Soft-delete a supplier
   */
  delete: (id) => api.delete(`${ENDPOINT}/${id}`).then((res) => res.data),

  /**
   * Get supplier aggregate stats
   */
  getStats: () => api.get(`${ENDPOINT}/stats`).then((res) => res.data),
};

export default supplierService;
