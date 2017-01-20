#!/usr/bin//env node

var createServer = require('../lib/cube/server');
var collector = require('../lib/cube/collector');

var server = createServer({
  'http-port': 1080
});

server.register = function(db, endpoints) {
  collector.register(db, endpoints);
};
server.start();
