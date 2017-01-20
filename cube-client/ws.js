var util = require('util');
var websocket = require('websocket');
var debug = require('debug')('cube-client:ws');

// returns an emitter which sends events one at a time to the given ws://host:port
module.exports = function(protocol, host, port) {
  var url = `${protocol}//${host}:${port}/1.0/event/put`;

  var emitter = {};
  var queue = [];
  var socket;
  var timeout;
  var closing;

  function close() {
    if (socket) {
      debug('closing socket');
      socket.removeListener('error', reopen);
      socket.removeListener('close', reopen);
      socket.close();
      socket = null;
    }
  }

  function closeWhenDone() {
    closing = true;
    if (socket) {
      if (!socket.bytesWaitingToFlush) {
        close();
      } else {
        setTimeout(closeWhenDone, 1000);
      }
    }
  }

  function open() {
    timeout = 0;
    close();
    debug('opening socket', url);
    var client = new websocket.client();
    client.on('connect', function(connection) {
      socket = connection;
      socket.on('message', log);
      socket.on('error', reopen);
      socket.on('close', reopen);
      flush();
      if (closing) closeWhenDone();
    });
    client.on('connectFailed', reopen);
    client.on('error', reopen);
    client.connect(url);
  }

  function reopen() {
    if (!timeout && !closing) {
      debug('reopening soon');
      timeout = setTimeout(open, 1000);
    }
  }

  function flush() {
    var event;
    while (event = queue.pop()) {
      try {
        socket.sendUTF(JSON.stringify(event));
      } catch (e) {
        debug(e.stack);
        reopen();
        return queue.push(event);
      }
    }
  }

  function log(message) {
    debug(message.utf8Data);
  }

  emitter.send = function(event) {
    queue.push(event);
    if (socket) flush();
    return emitter;
  };

  emitter.close = function() {
    closeWhenDone();
    return emitter;
  };

  open();

  return emitter;
};
