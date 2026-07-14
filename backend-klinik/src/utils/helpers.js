// Helper function untuk clean value
const clean = (val) => (val === '' || val === undefined || val === null ? null : val);

// Helper function untuk format date
const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
};

module.exports = {
  clean,
  formatDate
};
