import { RxBus } from './rx-bus';
import { Observable, concat, of, empty, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { rxBusNoValue, RxBusValueFactory } from './types';

// type CacheForKey<V> = [V | typeof noValue, Observable<V>];
type CacheForKey<V> = [V | typeof rxBusNoValue, Subscription];

export class RxBusCached<K, V> extends RxBus<K, V> {
  protected cache = new Map<K, CacheForKey<V>>();

  constructor(
    /**
     * How the future observables should be handled.
     */
    public cacheEnabledByDefault = false,
    /**
     * @returns a value to be emitted, but not cached, for empty cache
     */
    public noCachedValueFactory?: RxBusValueFactory<K, V>,
  ) { super(); }

  on<T extends V = V>(key: K): Observable<T> {
    // if (!this.isCacheEnabled(key)) {
    //   return super.on<T>(key);
    // }
    // return (this.cache.get(key) as CacheForKey<V>)[1] as Observable<T>;
    this.tryEnableCache(key);
    return concat(
      of(null).pipe(switchMap(() => {
        const cacheForKey = this.cache.get(key) as CacheForKey<V>;
        if (cacheForKey && cacheForKey[0] !== rxBusNoValue) {
          return of(cacheForKey[0] as T);
        }
        return this.noCachedValueFactory ? of(this.noCachedValueFactory(key) as T) : empty();
      })),
      super.on(key) as Observable<T>,
    );
  }

  emit(key: K, value: V): this {
    this.tryEnableCache(key);
    return super.emit(key, value);
  }

  isEmpty(key: K): boolean {
    return !this.isCacheEnabled(key) || !this.hasCachedValue(key);
  }

  isCacheEnabled(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Resets the cache for a particular key.
   */
  setCacheEnabled(key: K, cacheEnabled: boolean): this {
    if (cacheEnabled && !this.isCacheEnabled(key)) {
      // this.cache.set(key, [noValue, this.createCachedObservable(key)]);
      this.setCache(key, rxBusNoValue);
    } else if (!cacheEnabled && this.isCacheEnabled(key)) {
      this.cache.delete(key);
    }
    return this;
  }

  hasCachedValue(key: K): boolean {
    return this.isCacheEnabled(key) && this.cache.get(key)[0] !== rxBusNoValue;
  }

  getCachedValue(key: K): (V | typeof rxBusNoValue) {
    const cacheForKey = this.cache.get(key);
    if (!cacheForKey || cacheForKey[0] === rxBusNoValue) {
      return rxBusNoValue;
    }
    return cacheForKey[0];
  }

  setCachedValue(key: K, value: V | typeof rxBusNoValue, emit = false): this {
    const cacheForKey = this.cache.get(key);
    if (cacheForKey) {
      cacheForKey[0] = rxBusNoValue;
    } else {
      this.setCache(key, value);
    }
    if (emit && value !== rxBusNoValue) {
      this.emit(key, value);
    }
    return this;
  }

  reemitCachedValue(key: K): boolean {
    const cacheForKey = this.cache.get(key);
    if (cacheForKey && cacheForKey[0] !== rxBusNoValue) {
      this.emit(key, cacheForKey[0]);
    }
    return cacheForKey && cacheForKey[0] !== rxBusNoValue;
  }

  clearAllCache(): this {
    for (const cacheForKey of this.cache.values()) {
      cacheForKey[1].unsubscribe();
    }
    this.cache.clear();
    return this;
  }

  complete(key: K): this {
    if (this.isCacheEnabled(key)) {
      const cacheForKey = this.cache.get(key);
      if (cacheForKey) {
        cacheForKey[1].unsubscribe();
      }
      this.setCacheEnabled(key, false);
    }
    return super.complete(key);
  }

  private setCache(key: K, value: V | typeof rxBusNoValue) {
    this.cache.set(key, [value, this.subscribeForValueUpdates(key)]);
  }

  private subscribeForValueUpdates(key: K) {
    return super.on(key).subscribe(value => {
      const cacheForKey = this.cache.get(key);
      if (!cacheForKey) {
        return;
      }
      cacheForKey[0] = value;
    });
  }

  // private createCachedObservable(key: K) {
  //   const stream = super.on(key);
  //   return concat(
  //     of(null).pipe(switchMap(() => {
  //       const cacheForKey = this.cache.get(key) as CacheForKey<V>;
  //       return !cacheForKey || cacheForKey[0] === noValue ? empty : of(cacheForKey[0]);
  //     })),
  //     stream.pipe(tap(value => {
  //       const cacheForKey = this.cache.get(key);
  //       if (!cacheForKey) {
  //         return;
  //       }
  //       cacheForKey[0] = value;
  //     })),
  //   ).pipe(shareReplay(1));
  // }

  private tryEnableCache(key: K) {
    if (this.cacheEnabledByDefault) {
      this.setCacheEnabled(key, true);
    }
  }
}
