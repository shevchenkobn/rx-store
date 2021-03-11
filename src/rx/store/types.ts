import { Observable } from 'rxjs';
import {
  rxBusNoValue,
  valueNoop,
  KeyValuePair,
  CollectorObservableTransformer,
  RxBusEmitter,
  ObservableTransformer,
  defaultCollectorObservableTransformer,
  RxBusValueFactory
} from '../bus/types';

export interface RxStoreKeyTransformer<KR, K> {
  hash(rawKey: KR): K;
  unhash(key: K): KR;
}

export function getDefaultRxStoreKeyTransformer() {
  return {
    hash: valueNoop,
    unhash: valueNoop,
  };
}

/**
 * A transformer for emitting values in a different way.
 * @param valueSource The value source is safe to subscribe multiple times.
 * @returns A **single** actual value for the current key & current loading request as an Observable.
 */
export type RxStoreValueEmitter<K, V, VI = V, KR = K, C = unknown> = (
  this: C,
  emitter: RxBusEmitter<K, V>,
  key: K,
  valueSource: Observable<VI>,
  keyTransformer: RxStoreKeyTransformer<KR, K>
) => Observable<V>;
export function defaultRxStoreValueEmitter<K, V>(emitter: RxBusEmitter<K, V>, key: K, valueSource: Observable<V>) {
  valueSource.subscribe(value => emitter.emit(key, value));
  return valueSource;
}

export interface RxStoreConfig<K, V, KR = K, VI = V, KV = KeyValuePair<K, V>, C = unknown> {
  keyTransformer: RxStoreKeyTransformer<KR, K>;
  /**
   * Custom emission handler for RxStore.
   * RxStoreFromObservable doesn't use the return value from it, so it can be any default value.
   */
  valueEmitter: RxStoreValueEmitter<K, V, VI, KR, C>;
  collectorObservableTransformer: CollectorObservableTransformer<K, V, KV>;
  /**
   * The default is `false`
   */
  cacheEnabledByDefault?: boolean;
  /**
   * @returns a value to be emitted, but not cached, for empty cache
   */
  noCachedValueFactory?: RxBusValueFactory<K, V>;
}

export function getDefaultRxStoreConfig() {
  return {
    keyTransformer: getDefaultRxStoreKeyTransformer(),
    valueEmitter: defaultRxStoreValueEmitter,
    collectorObservableTransformer: defaultCollectorObservableTransformer,
  };
}

export type DataLoader<K, V, KR = K> = (key: K, keyTrasformer: RxStoreKeyTransformer<KR, K>) => Observable<V> | PromiseLike<V>;

export interface RxStoreByKey<K, V> {
  cacheEnabledByDefault: boolean;
  on<T extends V = V>(key: K): Observable<T>;
  isCacheEnabled(key: K): boolean;
  hasCachedValue(key: K): boolean;
  isEmpty(key: K): boolean;
  getCachedValue(key: K): V | typeof rxBusNoValue;
  setCacheEnabled(key: K, cacheEnabled: boolean): this;
  /**
   * @param emit Default is false
   */
  setCachedValue(key: K, value: V | typeof rxBusNoValue, emit?: boolean): this;
  reemitCachedValue(key: K): boolean;
  clearAllCache(): this;
}

export const rxStoreGlobalKey = Symbol('rxStoreGlobalKey');

export type RxStoreError<K, E> = {
  key: K;
  error: any;
} | {
  key: typeof rxStoreGlobalKey;
  error: E
};

export enum RxStoreErrorCodes {
  Closed = 'closed',
}

export interface RxStoreClosedError {
  type: RxStoreErrorCodes.Closed;
  error?: any;
}

export interface RxStoreSubscriberConfig<K, V, VI = V> {
  key?: K;
  destroyObservable?: Observable<any>;
  observableTransformer: ObservableTransformer<VI, V>;
}
