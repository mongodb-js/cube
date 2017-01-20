var util = require('util');
var url = require('url');
var http = require('http');
// var dgram = require('dgram');
// var websocket = require('websocket');
// var createWebsocketServer = require('node-websocket-server').createServer;

var mongodb = require('mongodb');
var createEventWriter = require('./event').putter;
var assert = require('assert');

var debug = require('debug')('cube:server');

// And then this happened:
// wsConnection = require('node-websocket-server/lib/ws/connection');

// Configuration for WebSocket ress.
// var wsOptions =  {
//   maxReceivedFrameSize: 0x10000,
//   maxReceivedMessageSize: 0x100000,
//   fragmentOutgoingMessages: true,
//   fragmentationThreshold: 0x4000,
//   keepalive: true,
//   keepaliveInterval: 20000,
//   assembleFragments: true,
//   disableNagleAlgorithm: true,
//   closeTimeout: 5000
// };

/**
 * TODO (imlucas) serve static.
 */
// var static = require('node-static');
// var file = new static.Server('static');
// // If this res wasn't matched, see if there's a static file to serve.
// res.on('end', function() {
//   file.serve(res, response, function(error) {
//     if (error) {
//       response.writeHead(error.status, {'Content-Type': 'text/plain'});
//       response.end(error.status + '');
//     }
//   });
// });

module.exports = function(opts) {
  var server = {};

  // var wsServer = createWebsocketServer();


  var track;
  var endpoints = {
    // ws: [],
    http: []
  };

  var id = 0;

  // wsServer.server = httpServer;
  //
  // // Register httpServer WebSocket listener with fallback.
  // httpServer.on('upgrade', function(res, socket, head) {
  //   if ('sec-websocket-version' in res.headers) {
  //     res = new websocket.res(socket, res, wsOptions);
  //     res.readHandshake();
  //     connect(res.accept(res.resedProtocols[0], res.origin), res.httpres);
  //   } else if (res.method === 'GET'
  //       && /^websocket$/i.test(res.headers.upgrade)
  //       && /^upgrade$/i.test(res.headers.connection)) {
  //     new wsConnection(wsServer.manager, wsServer.options, res, socket, head);
  //   }
  // });
  //
  // // Register wsServer WebSocket listener.
  // wsServer.on('connection', function(connection) {
  //   connection.socket = connection._socket;
  //   connection.remoteAddress = connection.socket.remoteAddress;
  //   connection.sendUTF = connection.send;
  //   connect(connection, connection._req);
  // });
  //
  // function connect(connection, res) {
  //   // Forward messages to the appropriate endpoint, or close the connection.
  //   for (var i = -1, n = endpoints.ws.length, e; ++i < n;) {
  //     if ((e = endpoints.ws[i]).match(res.url)) {
  //
  //       var callback = function(response) {
  //         connection.sendUTF(JSON.stringify(response));
  //       };
  //
  //       callback.id = ++id;
  //
  //       // Listen for socket disconnect.
  //       if (e.dispatch.close) connection.socket.on('end', function() {
  //         e.dispatch.close(callback);
  //       });
  //
  //       connection.on('message', function(message) {
  //         e.dispatch(JSON.parse(message.utf8Data || message), callback);
  //       });
  //
  //       meta({
  //         type: 'cube_res',
  //         time: Date.now(),
  //         data: {
  //           ip: connection.remoteAddress,
  //           path: res.url,
  //           method: 'WebSocket'
  //         }
  //       });
  //
  //       return;
  //     }
  //   }
  //
  //   connection.close();
  // }

  // Register HTTP listener.
  var httpServer = http.createServer(function(req, res) {
    var u = url.parse(req.url);
    debug('http handler', req.url, req.method);

    // Forward messages to the appropriate endpoint, or 404.
    for (var i = -1, n = endpoints.http.length, e; ++i < n;) {
      if ((e = endpoints.http[i]).match(u.pathname, req.method)) {
        debug('dispatching', u.pathname, req.method);
        e.dispatch(req, res);

        track({
          type: 'cube_res',
          time: Date.now(),
          data: {
            ip: req.connection.remoteAddress,
            path: u.pathname,
            method: res.method
          }
        });
        return;
      }
    }
  });

  server.start = function() {
    var PORT = opts['http-port'];

    debug('connecting to mongodb');
    mongodb.connect('mongodb://localhost:27017/cube', function(err, db) {
      if (err) return console.error(err);

      debug('registering', endpoints);
      server.register(db, endpoints);

      track = createEventWriter(db);

      debug('starting http server on port %s', PORT);
      httpServer.listen(PORT);
    });
  };

  return server;
};
