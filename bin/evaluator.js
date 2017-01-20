#! /usr/bin/env node

var createServer = require('../lib/cube/server');
var evaluator = require('../lib/cube/evaluator');

var server = createServer({
  'http-port': 1081
});
server.register = function(db, endpoints) {
  evaluator.register(db, endpoints);
};
server.start();
