import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export const rxBusNoValue = Symbol('rxBusNoValue');

export interface RxBusEmitter<K, V> {
  emit(key: K, value: V): this;
}

export type RxBusValueFactory<K, V> = (key: K) => V;

export type ObservableTransformer<VI, V> = (source: Observable<VI>) => Observable<V>;

export type CollectorObservableTransformer<K, V, T = V> = (source: Observable<V>, key: K) => Observable<T>;
export function defaultCollectorObservableTransformer<K, V>(source: Observable<V>, key: K) {
  return source.pipe(map(value => ({ key, value } as KeyValuePair<K, V>)));
}

export function valueNoop<V>(value: V) {
  return value;
}

export interface KeyValuePair<K, V> {
  key: K;
  value: V;
}

export enum RxBusMetaEventName {
  ObservableGet = 'observable-get',
  ObservableComplete = 'observable-complete',
}

export interface RxBusGetObservableMetaEvent<K, V> extends RxBusMetaEventBase {
  type: RxBusMetaEventName.ObservableGet;
  key: K;
  observable: Observable<V>;
}

export interface RxBusObservableCompleteMetaEvent<K, V> extends RxBusMetaEventBase {
  type: RxBusMetaEventName.ObservableComplete;
  key: K;
}

export interface RxBusMetaEventBase {
  type: RxBusMetaEventName;
}

export type RxBusMetaEvent<S extends Subject<V>, K, V> = RxBusGetObservableMetaEvent<K, V>
  | RxBusObservableCompleteMetaEvent<K, V>;
