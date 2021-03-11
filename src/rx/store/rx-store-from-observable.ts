import { RxStore } from './rx-store';
import { Observable, of } from 'rxjs';
import { KeyValuePair } from '../bus/types';
import {
  RxStoreClosedError,
  rxStoreGlobalKey,
  RxStoreErrorCodes,
  RxStoreConfig,
  getDefaultRxStoreConfig
} from './types';
import { shareReplay } from 'rxjs/operators';

export class RxStoreFromObservable<K, V, KR = K, VI = V, KV = KeyValuePair<K, V>> extends RxStore<K, V, KR, VI, KV, RxStoreClosedError> {
  protected isOpenValue = true;
  get isOpen() {
    return this.isOpenValue;
  }

  static create<K, V>(
    sourceObservable: Observable<KeyValuePair<K, V>>,
    config?: Omit<
      RxStoreConfig<K, V, K, V, KeyValuePair<K, V>, RxStoreFromObservable<K, V, K, V, KeyValuePair<K, V>>>,
      'collectorObservableTransformer' | 'keyTransformer' | 'valueEmitter'
    >
  ): RxStoreFromObservable<K, V, K, V, KeyValuePair<K, V>>;
  static create<K, V, KR>(
    sourceObservable: Observable<KeyValuePair<K, V>>,
    config: Omit<
      RxStoreConfig<K, V, KR, V, KeyValuePair<K, V>, RxStoreFromObservable<K, V, KR, V, KeyValuePair<K, V>>>,
      'collectorObservableTransformer' | 'valueEmitter'
    >
  ): RxStoreFromObservable<K, V, KR, V, KeyValuePair<K, V>>;
  static create<K, V, KR, VI>(
    sourceObservable: Observable<KeyValuePair<K, VI>>,
    config: Omit<
      RxStoreConfig<K, V, KR, VI, KeyValuePair<K, V>, RxStoreFromObservable<K, V, KR, VI, KeyValuePair<K, V>>>,
      'collectorObservableTransformer'
    >
  ): RxStoreFromObservable<K, V, KR, VI, KeyValuePair<K, V>>;
  static create<K, V, KR, VI, KV>(
    sourceObservable: Observable<KeyValuePair<K, VI>>,
    config: RxStoreConfig<K, V, KR, VI, KV, RxStoreFromObservable<K, V, KR, VI, KV>>,
  ): RxStoreFromObservable<K, V, KR, VI, KV>;
  static create<K, V, KR, VI, KV>(
    sourceObservable: Observable<KeyValuePair<K, VI>>,
    config?: Partial<RxStoreConfig<K, V, KR, VI, KV, RxStoreFromObservable<K, V, KR, VI, KV>>>,
  ): RxStoreFromObservable<K, V, KR, VI, KV> {
    return new RxStoreFromObservable<K, V, KR, VI, KV>(sourceObservable, Object.assign(getDefaultRxStoreConfig(), config));
  }

  protected constructor(
    sourceObservable: Observable<KeyValuePair<K, VI>>,
    config: RxStoreConfig<K, V, KR, VI, KV, RxStoreFromObservable<K, V, KR, VI, KV>>,
  ) {
    super(config);
    const subscription = sourceObservable.subscribe(({ key, value }) => {
      this.emitSafely(key, of(value).pipe(shareReplay(1)));
    }, error => this.close(error), () => this.close());
    if (subscription.closed) {
      this.close();
    }
  }

  private close(error?: any) {
    this.collector.unsubscribe();
    this.bus.completeAll();
    this.isOpenValue = false;
    this.errorsSubject.next({
      key: rxStoreGlobalKey,
      error: error ? {
        error,
        type: RxStoreErrorCodes.Closed,
      } : { type: RxStoreErrorCodes.Closed }
    });
    this.errorsSubject.complete();
  }
}
