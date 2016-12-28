var assert = require('assert');
var test = require('./helpers');
var _types = require('../lib/cube/types');
var mongodb = require('mongodb');

describe('types', function() {
  var types = _types(test.db);

  it('returns collection cache for a given database', function() {
    assert.equal(typeof types, 'function');
  });

  it('each typed collection has events and metrics', function() {
    var collection = types('random');
    var keys = Object.keys(collection);
    keys.sort();

    assert.deepEqual(keys, ['events', 'metrics']);
    assert.isTrue(collection.events instanceof mongodb.Collection);
    assert.isTrue(collection.metrics instanceof mongodb.Collection);
    assert.equal(collection.events.collectionName, 'random_events');
    assert.equal(collection.metrics.collectionName, 'random_metrics');
  });

  it('memoizes cached collections', function() {
    assert.strictEqual(types('random'), types('random'));
  });
});
