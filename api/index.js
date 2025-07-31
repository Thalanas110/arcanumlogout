// Vercel API entry point for serverless functions
module.exports = (req, res) => {
  require('../server')(req, res);
};
