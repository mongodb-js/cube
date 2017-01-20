#!/usr/bin//env node

var cube = require('../');
var server = cube.server({
  'http-port': 1080
});
server.register = function(db, endpoints) {
  cube.collector.register(db, endpoints);
};
server.start();
