'use strict';

const Diff = require('./lib/diff');

module.exports = function (app) {
  app.loopback.modelBuilder.mixins.define('Diff', Diff);
};
