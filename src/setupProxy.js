const { createProxyMiddleware } = require('http-proxy-middleware');
const os = require('os');

module.exports = function(app) {
  const localIp = Object.values(os.networkInterfaces())
    .flat()
    .find(ip => ip.family === 'IPv4' && !ip.internal)?.address;

  app.use(
    '/api',
    createProxyMiddleware({
      target: `http://${localIp || 'localhost'}:5000`,
      changeOrigin: true,
    })
  );
};