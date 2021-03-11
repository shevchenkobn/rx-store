import { Observable, Subject, empty } from 'rxjs';
import { RxBusCached } from '../bus/rx-bus-cached';
import {
  RxStoreByKey,
  RxStoreError,
  RxStoreValueEmitter,
  RxStoreConfig,
  RxStoreKeyTransformer,
} from './types';
import { RxBusCollector } from '../bus/rx-bus-collector';
import { CollectorObservableTransformer } from '../bus/types';
import { catchError, shareReplay, take } from 'rxjs/operators';

export abstract class RxStore<K, V, KR, VI, KV, E = any> {
  protected bus: RxBusCached<K, V>;
  get byKey(): RxStoreByKey<K, V> {
    return this.bus;
  }

  protected errorsSubject = new Subject<RxStoreError<K, E>>();
  readonly errors$ = this.errorsSubject.asObservable();

  protected collector: RxBusCollector<K, V, KV>;
  readonly all$: Observable<KV>;
  private collectorObservableTransformer: CollectorObservableTransformer<K, V, KV>;
  valueEmitter: RxStoreValueEmitter<K, V, VI, KR, this>;
  /**
   * Key transformer is not used by the store internally, but is meant as a helper for loading & consumers.
   */
  keyTransformer: RxStoreKeyTransformer<KR, K>;

  protected constructor(config: RxStoreConfig<K, V, KR, VI, KV, RxStore<K, V, KR, VI, KV, E>>) {
    const fullConfig = Object.assign({
      cacheEnabledByDefault: false
    }, config);
    this.keyTransformer = fullConfig.keyTransformer;
    this.valueEmitter = fullConfig.valueEmitter.bind(this);
    this.bus = new RxBusCached<K, V>(fullConfig.cacheEnabledByDefault, fullConfig.noCachedValueFactory);
    this.collectorObservableTransformer = fullConfig.collectorObservableTransformer;
    this.collector = new RxBusCollector(this.bus, this.collectorObservableTransformer);
    this.all$ = this.collector.stream$;
  }

  protected emitSafely(key: K, valueSource: Observable<VI>): Observable<V> {
    try {
      return this.valueEmitter(this.bus, key, valueSource.pipe(
        take(1),
        catchError(error => {
          this.errorsSubject.next({ key, error });
          return empty();
        }),
        shareReplay(1)
      ), this.keyTransformer);
    } catch (error) {
      this.errorsSubject.next({ key, error });
      return empty();
    }
  }
}
