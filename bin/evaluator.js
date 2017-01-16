#!/usr/bin/env node

var options = require('./evaluator-config');
var cube = require('../');
var server = cube.server(options);

server.register = function(db, endpoints) {
  cube.evaluator.register(db, endpoints);
};

server.start();
