# RxStore - a library to use RxJs as a store for arbitrary data in any environment.

## Preface
- There are 2 data access strategies:
  - `pull` - a data consumer (e.g. HTTP client) requests the data from a data provider (e.g. HTTP server). The data is delievered immediately and connection is being closed. Usually, it is one-to-one relation (one consumer requests data for itself once).
  - `push` - a data consumer initiates a subscribtion (e.g. WebSocket client) to a data provider (e.g. WebSocket Push-notification server). The data is delievered when it becomes available or changes, hence keeping *all* the data consumers up-to-date, making it one-to-many relation (one provider pushes data to all consumers simultaneously). Optionally there can be initial data response or the first piece of data will arrive only when changed.
- Any cache is basically a key-value storage. All keys in the cache must be comparable and/or hashable, i.e. for the same keys the same value must be returned.
- RxJs is a library, which provides instruments to work with an asynchronuous data stream. Its power is in its operators, that manipulate this stream.

## Goals
This library implements `push` data strategy with optional caching. The caching of value for a particular key (or an entire store) can be easily turned on or off.

If the store contains values of type `V`, that can be accessed by keys of type `K`, then any value can be retrieved as `Observable<V>` given a key of type `K`.

There're 2 types of stores:
- `RxStoreFromLoader` - a store that loads the data from an external data source.
- `RxStoreFromObservable` - a store that consumes the data from an `Observable<KeyValuePair<K, V>>`. This store takes an observable of key-value pairs, that are to be distrubuted to specific `Subject<V>` by their keys in `RxStoreFromObservable`.

Everything is very strictly typed with usability & default behaviour in mind.

It is possible to configure logic at any step of the data pipeline.

## Architecture
### RxBus
A core of the `RxStore` is a map from keys to observables (`Map<K, Subject<V>>` - subject is used to emit values internally, `Observable<V>` is returned outside). This map of observables is referred as `RxBus` - a bus to move data. There're 3 types of busses:
- `RxBus` - the most simple bus, that doesn't support caching, only sharing values between data consumers. Uses `Subject<V>` for storing values.
- `BehaviourRxBus` - a bus with caching always enabled, meaning that the last value emitted for a key `K` will be cached and emitted whenever new subscribtion is initiated (even if subscribed after the value emitted). Data is shared between subscribers, `BehaviorSubject<V>` is used for each key-value.
- `RxBusCached` - the most advanced bus, that supports both data sharing between all subscriber for a particular key and optional caching, that can be turned on and off individually or globally. A `Symbol` is used `rxBusNoValue` to mark an empty cache. Caching is disabled by default.

There is also a set of helper types & interfaces.

Inheritance is used to share common `RxBus` logic.

Each `RxBus` is lazily-evaluated, meaning that `Subject<V>` will be created only when requested for the first time. They can also be destroyed later. It also has meta-events, that are fired whenever subjects are created or destroyed internally.

### RxCollector
To implement `RxStoreFromObservable` that can consume data from another `RxStore` there must be a single `Observable<KeyValuePair<K, V>>` of key-value pairs.

`RxCollector` uses `RxBus` meta-events to collect all events by subscribing and unsubscribing to all `Observable<V>` that `RxBus` keeps.

### RxStore
As mentioned earlier, there are 2 types of `RxStore` - `RxStoreFromLoader` and `RxStoreFromObservable`. Regardless of its type, each `RxStore` has:
- `byKey` - a place where values are stored. It uses `RxBusCached<K, V>` and  allows only readonly, pure `RxBus` methods. Other `RxBus` methods can be used by inheriting `RxStore`.
- `errors$` - a stream of errors. It can have errors for a particular key or global errors, which have `Symbol` named `rxStoreGlobalKey` as key.
- `all$` - a stream of all emitted values as key-value pairs, collected by `RxCollector`.
- `keyTransformer` - is **not** used by `RxStore` internally and is meant as a helper for presumable hashing & unhashing of keys `K`.

#### RxStoreFromLoader
`RxStoreFromLoader` has several data loading methods. Each of them calls internal loader function & emits the value to `RxBusCached<K, V>`. They differ by their return values:
- `load(K): this` - returns the store itself for chaining e.g. `store.load(1).load(2).load(3);` will start loading data for keys 1, 2, and 3.
- `load$(K): Observable<V>` - returns the `Observable<V>`, that can be accessed using `byKey` property.
- `loadRaw(K): Observable<V>` - returns one-shot `Observable<V>`, returned by loader function, **not** stream of values `V` for key `K`.

There are also similar methods, but they load data only if cache is disabled for that particular key or the cache is empty:
- `loadIfEmpty(K): this` - returns the store itself.
- `loadIfEmpty$(K): Observable<V>` - returns stream, accessed by `byKey`
- `loadRawIfEmpty(K): Observable<V>` - returns one-shot `Observable<V>`, returned by loader function.

#### RxStoreFromObservable
`RxStoreFromObservable` doesn't have any additional methods and relies entirely on `RxStore` base methods.

It has `isOpen` property, which shows, whether the source observable is not complete. When the source observable completes with or without error, an error is emitted with code `RxStoreErrorCodes.Closed`.

_To create `RxStoreFromObservable` from `RxStore` one simply needs to do `RxStoreFromObservable.create(sourceStore.all$)`._

### RxStoreSubscriber
Quite often when the data is consumed the key itself might change. It means, that there is a need to unsubscribe from old key subscription and to subscribe to a new key using `RxStore.byKey`.

This can be tedious, so there is `RxStoreSubscriber` that can seamlessly switch between different keys without the need to do it manually. The only place where the data comes from is `RxStoreSubscriber.stream$`.

**WARNING!**
**`RxStoreSubscriber.stream$` and `RxStore.all$.pipe(filter(k => k === myKey))` are not equivalent! If there is a cached value for a changed key `K`, it _will_ be emitted by `RxStoreSubscriber.stream$` and not by `RxStore.all$`: it sends only updates, while `RxStoreSubscriber` retrieves cached values first where possible.**

There is an ability to pass an observable, which can be completed for the `RxStoreSubscriber` to destroy it self.

The class has following methods:
- `stream$` - data outlet, which must be used to retrieve data.
- `storeKey` - a getter for the current key.
- `isSubscribed` - a property which is true, when there is subscribtion (the key is set).
- `hasDestroyObservable` - a property which is true, when there is a destroy observable set.
- `setKey(key: K): this` - a setter to change the key.
- `setObservableTransformer(observableTransformer): this` - a setter to change the observable transformer (a mapping function from an observable to another observable).
- `setDestroyObservable(observable): this` - a setter for destroy observable.
- `unsubscribe(): this` - a setter to deliberately unsubscribe from store. Later resubscribtion is possible using `setKey()`.
