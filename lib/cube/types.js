// Much like db.collection, but caches the result for both events and metrics.
// Also, this is synchronous, since we are opening a collection unsafely.

var collections = {};

var assert = require('assert');
var debug = require('debug')('cube:types');

var eventRe = /_events$/;

function getCollectionForType(db, type) {
  debug('get collection for type', type);

  var collection = collections[type];
  if (!collection) {
    debug('not in cache.  allocating.');
    collection = collections[type] = {
      events: db.collection(`${type}_events`),
      metrics: db.collection(`${type}_metrics`)
    };
  }
  debug('returning');
  return collection;
}

function getTypes(db, req, done) {
  debug('getTypes');

  db.listCollections().toArray(function(err, colls) {
    assert.ifError(err);

    debug('listCollections', colls);

    var names = colls.map(function(c) {
      return c.name;
    });

    var res = names.map(function(d) {
      return d.split(".")[1];
    })
    .filter(function(d) {
      return eventRe.test(d);
    })
    .map(function(d) {
      return d.substring(0, d.length - 7);
    })
    .sort();

    debug('getTypes res', res);
    done(res);
  });
};

module.exports = function(db) {
  return getCollectionForType.bind(null, db);
};

module.exports.getter = function(db) {
  return getTypes.bind(null, db);
};
