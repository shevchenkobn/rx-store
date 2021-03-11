import { RxStore } from './rx-store';
import { finalize, shareReplay, take } from 'rxjs/operators';
import { DataLoader, RxStoreConfig, getDefaultRxStoreConfig } from './types';
import { Observable, empty } from 'rxjs';
import { KeyValuePair } from '../bus/types';

export class RxStoreFromLoader<K, V, KR = K, VI = V, KV = KeyValuePair<K, V>, E = any> extends RxStore<K, V, KR, VI, KV, E> {

  static create<K, V>(
    loader: DataLoader<K, V, K>,
    config?: Omit<
      RxStoreConfig<K, V, K, V, KeyValuePair<K, V>, RxStoreFromLoader<K, V, K, V, KeyValuePair<K, V>>>,
      'collectorObservableTransformer' | 'keyTransformer' | 'valueEmitter'
    >
  ): RxStoreFromLoader<K, V, K, V, KeyValuePair<K, V>>;
  static create<K, V, KR>(
    /**
     * If Observable is returned, only the first value is consumed.
     */
    loader: DataLoader<K, V, KR>,
    config: Omit<
      RxStoreConfig<K, V, KR, V, KeyValuePair<K, V>, RxStoreFromLoader<K, V, KR, V, KeyValuePair<K, V>>>,
      'collectorObservableTransformer' | 'valueEmitter'
    >
  ): RxStoreFromLoader<K, V, KR, V, KeyValuePair<K, V>>;
  static create<K, V, KR, VI>(
    /**
     * If Observable is returned, only the first value is consumed.
     */
    loader: DataLoader<K, VI, KR>,
    config: Omit<
      RxStoreConfig<K, V, KR, VI, KeyValuePair<K, V>, RxStoreFromLoader<K, V, KR, VI, KeyValuePair<K, V>>>,
      'collectorObservableTransformer'
    >
  ): RxStoreFromLoader<K, V, KR, VI, KeyValuePair<K, V>>;
  static create<K, V, KR, VI, KV>(
    /**
     * If Observable is returned, only the first value is consumed.
     */
    loader: DataLoader<K, VI, KR>,
    config: RxStoreConfig<K, V, KR, VI, KV, RxStoreFromLoader<K, V, KR, VI, KV>>
  ): RxStoreFromLoader<K, V, KR, VI, KV>;
  static create<K, V, KR, VI, KV>(
    /**
     * If Observable is returned, only the first value is consumed.
     */
    loader: DataLoader<K, VI, KR>,
    config?: Partial<RxStoreConfig<K, V, KR, VI, KV, RxStoreFromLoader<K, V, KR, VI, KV>>>
  ): RxStoreFromLoader<K, V, KR, VI, KV> {
    return new RxStoreFromLoader<K, V, KR, VI, KV>(loader, Object.assign(getDefaultRxStoreConfig(), config));
  }

  protected constructor(
    public loader: DataLoader<K, VI, KR>,
    config?: RxStoreConfig<K, V, KR, VI, KV, RxStoreFromLoader<K, V, KR, VI, KV>>
  ) {
    super(config);
  }

  load(key: K): this {
    this.emitSafely(key, this.loadForKey(key));
    return this;
  }

  load$(key: K): Observable<V> {
    this.load(key);
    return this.bus.on(key);
  }

  loadRaw(key: K): Observable<V> {
    return this.emitSafely(key, this.loadForKey(key));
  }

  loadIfEmpty(key: K): this {
    if (this.bus.isEmpty(key)) {
      this.load(key);
    }
    return this;
  }

  loadIfEmpty$(key: K): Observable<V> {
    return this.bus.isEmpty(key) ? this.load$(key) : this.bus.on(key);
  }

  loadRawIfEmpty(key: K): Observable<V> {
    return this.bus.isEmpty(key) ? this.loadRaw(key) : empty();
  }

  private loadForKey(key: K): Observable<VI> {
    return new Observable(subscriber => {
      try {
        const result = this.loader(key, this.keyTransformer);
        if ('then' in result) {
          const promise = result.then(value => {
            subscriber.next(value);
            subscriber.complete();
          });
          if ('catch' in promise) {
            (promise as Promise<V>).catch(error => {
              this.errorsSubject.next({ key, error });
              subscriber.complete();
            });
          }
        } else {
          result.pipe(
            take(1),
            finalize(() => {
              subscriber.complete();
            }),
            shareReplay(1),
          ).subscribe(value => {
            subscriber.next(value);
          }, error => this.errorsSubject.next({ key, error }));
        }
      } catch (error) {
        this.errorsSubject.next({ key, error });
        subscriber.complete();
      }
    });
  }
}
