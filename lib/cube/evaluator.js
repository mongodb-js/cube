var endpoint = require('./endpoint');
var url = require('url');

// To avoid running out of memory, the GET endpoints have a maximum number of
// values they can return. If the limit is exceeded, only the most recent
// results are returned.
var limitMax = 1e4;

var headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

// var event = createEventReader(db);
// var metric = createMetricReader(db);
// var types = createTypesReader(db);
//
// //
// // endpoints.ws.push(
// //   endpoint('/1.0/event/get', event),
// //   endpoint('/1.0/metric/get', metric),
// //   endpoint('/1.0/types/get', types)
// // );

var createEventReader = require('./event').getter;
var createMetricReader = require('./metric').getter;
var createTypesReader = require('./types').getter;

function chronological(a, b) {
  return a.time - b.time;
}

exports.register = function(db, endpoints) {
  var event = createEventReader(db);
  function eventGet(req, res) {
    req = url.parse(req.url, true).query;

    var data = [];

    // Provide default start and stop times for recent events.
    // If the limit is not specified, or too big, use the maximum limit.
    if (!('stop' in req)) {
      req.stop = Date.now();
    }

    if (!('start' in req)) {
      req.start = 0;
    }
    if (!(+req.limit <= limitMax)){
      req.limit = limitMax;
    }

    if (event(req, callback) < 0) {
      res.writeHead(400, headers);
      res.end(JSON.stringify(data[0]));
    } else {
      res.writeHead(200, headers);
    }

    function callback(d) {
      if (d == null) res.end(JSON.stringify(data.reverse()));
      else data.push(d);
    }
  }

  endpoints.http.push(
    endpoint('GET', '/1.0/events', eventGet)
  );



  var metric = createMetricReader(db);
  function metricGet(req, res) {
    req = url.parse(req.url, true).query;

    var data = [],
        limit = +req.limit,
        step = +req.step;

    // Provide default start, stop and step times for recent metrics.
    // If the limit is not specified, or too big, use the maximum limit.
    if (!('step' in req)) req.step = step = 1e4;
    if (!('stop' in req)) req.stop = Math.floor(Date.now() / step) * step;
    if (!('start' in req)) req.start = 0;
    if (!(limit <= limitMax)) limit = limitMax;

    // If the time between start and stop is too long, then bring the start time
    // forward so that only the most recent results are returned. This is only
    // approximate in the case of months, but why would you want to return
    // exactly ten thousand months? Don't rely on exact limits!
    var start = new Date(req.start),
        stop = new Date(req.stop);
    if ((stop - start) / step > limit) req.start = new Date(stop - step * limit);

    if (metric(req, callback) < 0) {
      res.writeHead(400, headers);
      res.end(JSON.stringify(data[0]));
    } else {
      res.writeHead(200, headers);
    }

    function callback(d) {
      if (d.time >= stop) res.end(JSON.stringify(data.sort(chronological)));
      else data.push(d);
    }
  }

  endpoints.http.push(endpoint('GET', '/1.0/metrics', metricGet));


  var types = createTypesReader(db);
  function typesGet(req, res) {
    types(url.parse(req.url, true).query, function(data) {
      res.writeHead(200, headers);
      res.end(JSON.stringify(data));
    });
  }

  endpoints.http.push(endpoint('GET', '/1.0/types', typesGet));
};
