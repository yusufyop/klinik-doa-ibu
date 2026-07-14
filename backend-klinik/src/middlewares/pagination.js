// Pagination middleware
const paginate = (req, res, next) => {
  req.pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    search: req.query.search || '',
    search_type: req.query.search_type || 'nama'
  };
  req.pagination.offset = (req.pagination.page - 1) * req.pagination.limit;
  next();
};

module.exports = paginate;
