/**
 * Standardized pagination parser and response formatter.
 * 
 * @param {Object} query - The req.query object from Express
 * @returns {Object} { page, limit, skip }
 */
const getPaginationArgs = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Formats a paginated response wrapper.
 * 
 * @param {Array} data - The array of documents
 * @param {Number} total - Total count of documents
 * @param {Number} page - Current page
 * @param {Number} limit - Documents per page
 * @returns {Object} Pagination metadata object
 */
const formatPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }
  };
};

module.exports = {
  getPaginationArgs,
  formatPaginatedResponse,
};
