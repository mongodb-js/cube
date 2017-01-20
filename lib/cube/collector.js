var endpoint = require('./endpoint');
var headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

var createEventWriter = require('./event').putter;
var createCollectdWriter = require('./collectd').putter;

function post(putter) {
  return function(req, res) {
    var content = '';
    req.on('data', function(chunk) {
      content += chunk;
    });
    req.on('end', function() {
      try {
        JSON.parse(content).forEach(putter);
      } catch (e) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({error: e.toString()}));
        return;
      }
      res.writeHead(200, headers);
      res.end('{}');
    });
  };
}


exports.register = function(db, endpoints) {
  var putter = createEventWriter(db);
  var poster = post(putter);

  //
  // endpoints.ws.push(
  //   endpoint('/1.0/event/put', putter)
  // );

  //
  endpoints.http.push(
    endpoint('POST', '/1.0/event', poster),
    endpoint('POST', '/1.0/event/collectd', createCollectdWriter(putter))
  );

  //
  // endpoints.udp = putter;
};
