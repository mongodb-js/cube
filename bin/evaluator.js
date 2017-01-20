#! /usr/bin/env node

var cube = require('../');
var server = cube.server({
  'http-port': 1081
});

server.register = function(db, endpoints) {
  cube.evaluator.register(db, endpoints);
};

server.start();
