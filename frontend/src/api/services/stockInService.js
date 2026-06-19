import api from "../axiosInstance";

const ENDPOINT = "/stock-in";

const stockInService = {
  /** Paginated list with filters */
  getAll: (params = {}) =>
    api.get(ENDPOINT, { params }).then((res) => res.data),

  /** Stats counts by status */
  getStats: () => api.get(`${ENDPOINT}/stats`).then((res) => res.data),

  /** Single PO with items */
  getById: (id) => api.get(`${ENDPOINT}/${id}`).then((res) => res.data),

  /** Batch & expiry records linked to this PO */
  getBatches: (id) =>
    api.get(`${ENDPOINT}/${id}/batches`).then((res) => res.data),

  /** Create a new PO */
  create: (data) => api.post(ENDPOINT, data).then((res) => res.data),

  /** Update a Draft/Pending PO */
  update: (id, data) =>
    api.patch(`${ENDPOINT}/${id}`, data).then((res) => res.data),

  /** Receive stock — updates Stock, Medicine_Batch, Inventory_Log */
  receive: (id, data) =>
    api.post(`${ENDPOINT}/${id}/receive`, data).then((res) => res.data),

  /** Cancel a PO */
  cancel: (id) =>
    api.post(`${ENDPOINT}/${id}/cancel`).then((res) => res.data),

  /** Soft-delete a PO */
  delete: (id) => api.delete(`${ENDPOINT}/${id}`).then((res) => res.data),
};

export default stockInService;
