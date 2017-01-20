# Queries

The [evaluator](Evaluator) supports two different types of queries. One for [events](Events) and one for [metrics](Metrics).

## Metric Expressions

The simplest type of metric expression is *reduce(type)*, where *reduce* is a reduce function, and *type* is an event type. The *type* must match the `type` field in [events](Events) emitted to [collectors](Collector). To count the number of "request" events:

```js
sum(request)
```

In this case, the subexpression `request` matches all request events. You can filter those events to only requests of interest, say only requests to "/account" from Chrome browsers:

```js
sum(request.eq(path, "/account").re(user_agent, "^Chrome/"))
```

The `eq` filter requires an exact match, while the `re` filter applies a [regular expression](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-RegularExpressions). The filter is applied to a *field* on the event's data object. A field can be a simple identifier such as *duration*, or a nested field such as *foo.bar.baz*; likewise, you can reference array elements such as *location[0]*. See the MongoDB documentation for more examples of referencing [embedded fields](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-ValueinanEmbeddedObject).

A reduce function, such as `sum`, takes an array of values as input. To count events, you can use the default value of 1, and reduce via sum. You can also specify the value for each event explicitly via parentheses:

```js
sum(request(1))
```

Thus, the *value* is optional; if not specified, the value derived from each event is 1. If a *value* is specified, it is either a field or an arithmetic expression that may include fields and numbers. This value is then fed to the reduces. For example, if request events have a duration field, you can feed that to a reduce as *request(duration)* for a [load](http://en.wikipedia.org/wiki/Load_(computing\))-type metric:

```js
sum(request(duration))
```

This can be combined with filters, so as to sum the duration for only requests whose path is "/account":

```js
sum(request(duration).eq(path, "/account"))
```

You can use simple arithmetic operators on values as well. Note that you can combine constants with data accessors:

```js
sum(foo(i * j - 2)) // do some arithmetic on foo.i, foo.j
sum(foo(i[0])) // access an array's first element
```

You can even construct compound metrics using similar arithmetic. For example, to compute the average duration for requests:

```
sum(request(duration)) / sum(request)
```

Cube supports constant metrics, such as `42`, that can be combined with other metrics. For example, `sum(foo(.1))` and `sum(foo) / 10` are equivalent.

The full query grammar is in [metric-expression.peg](/square/cube/blob/master/lib/cube/metric-expression.peg).

### Reduces

The available *reduce* functions are:

* sum
* min
* max
* median
* distinct

The sum, min and max reducers are *pyramidal*, in that they can be computed from aggregate metrics at the lower tier. For example, if you request an hourly sum, Cube will add together cached five-minute sums, if available. Pyramidal reducers are therefore typically much faster than median and distinct.

### Filters

The available *filter* functions are:

* eq - equal.
* lt - less than.
* le - less than or equal to.
* gt - greater than.
* ge - greater than or equal to.
* ne - not equal to.
* re - regular expression.
* in - one of an array of values (e.g., `in(foo, [1, 2, 3])`).

Multiple filters can be chained together, such as *sum(request.ge(duration, 250).lt(duration, 500))*.

If a filter is tested against an array, the filter will return true (*i.e.*, match the event) if *any* element in the array passes the filter. Filters are tested against literal values, such as strings, numbers and booleans. Cube may allow testing of derived values in the future (arithmetic expressions on data fields, similar to how the event’s value is derived).

## Event Expressions

Event expressions are similar to metric expressions, but used for querying events rather than computing metrics. Event expressions are used with the evaluator's [event/get](Evaluator#wiki-event_get) endpoint, for example. The general form of an event query is: *type(value1, value2…).filter(field, literal)*. The values (*value1*, *value2*, etc.) are optional; if you don't specify any values, then only the event time is returned. For example, to retrieve the time of requests:

```js
request
```

To retrieve the time and path of requests:

```js
request(path)
```

To retrieve the time and path of requests from Chrome browsers:

```
request(path).re(user_agent, "^Chrome/")
```

The full query grammar is in [event-expression.peg](/square/cube/blob/master/lib/cube/event-expression.peg).


### Caveats

Do not put in extra blanks between arguments as that can cause problems with the expression parser and yields an empty result, i.e. write `request.eq(field,"value")` but not `request.eq(field, "value")`.
