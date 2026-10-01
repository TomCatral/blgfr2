const { readRuntimePort } = require('../scripts/dev-runtime.cjs');

const target = `http://127.0.0.1:${Number(process.env.BLGF_API_PORT || readRuntimePort())}`;

module.exports = {
  '/api': {
    target,
    changeOrigin: true,
    secure: false,
  },
  '/blgflogo.jpg': {
    target,
    changeOrigin: true,
    secure: false,
  },
};