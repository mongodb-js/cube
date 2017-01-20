var util = require('util');
var dgram = require('dgram');

/**
 * Returns an emitter which sends events one at a time to the given [`host`, `port`].
 */
module.exports = function(host, port) {
  var emitter = {};
  var queue = [];
  var udp = dgram.createSocket('udp4');
  var closing;

  function send() {
    var event = queue.pop();
    if (!event) return;
    var buffer = new Buffer(JSON.stringify(event));
    udp.send(buffer, 0, buffer.length, port, host, function(error) {
      if (error) console.warn(error);
      if (queue.length) setImmediate(send);
      else if (closing) udp.close();
    });
  }

  emitter.send = function(event) {
    if (!closing && queue.push(event) == 1) setImmediate(send);
    return emitter;
  };

  emitter.close = function() {
    if (queue.length) closing = 1;
    else udp.close();
    return emitter;
  };

  return emitter;
};
