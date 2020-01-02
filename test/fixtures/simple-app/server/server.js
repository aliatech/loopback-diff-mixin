'use strict';

const http = require('http');
const loopback = require('loopback');
const boot = require('loopback-boot');
const app = loopback();

module.exports = async function () {
  return new Promise((resolve, reject) => {
    // Once the application bootstrapped
    app.start = () => {
      // Mount API REST
      app.use(app.get('restApiRoot'), loopback.rest());
      // Start the web server
      const server = http.createServer(app);
      server.listen(app.get('port'));
      resolve(app);
    };
    // Bootstrap the application, configure models, datasources and middlewares.
    boot(app, __dirname, (err) => {
      if (err) return reject(err);
      app.start();
    });
  });
};
