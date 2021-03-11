import { ObservableTransformer, valueNoop } from '../bus/types';
import { Observable, Subscription, Subject } from 'rxjs';
import { RxStore } from './rx-store';
import { rxBusNoValue } from '../bus/types';
import { RxStoreSubscriberConfig } from './types';
import { finalize } from 'rxjs/operators';

export class RxStoreSubscriber<K, V, VI = V, S extends RxStore<K, VI, any, any, any, any> = RxStore<K, VI, any, any, any, any>> {
  protected key: K | typeof rxBusNoValue;
  protected subscription: Subscription | null = null;
  protected observableTransformerValue: ObservableTransformer<VI, V>;
  protected readonly subject = new Subject<V>();

  protected destroyObservableSubscription: Subscription | null = null;

  readonly stream$ = this.subject.asObservable();
  get storeKey() {
    return this.key;
  }
  get isSubscribed() {
    return this.key === rxBusNoValue;
  }
  get hasDestroyObservable() {
    return !this.destroyObservableSubscription;
  }
  get observableTransformer() {
    return this.observableTransformerValue;
  }

  static create<K, V, S extends RxStore<K, V, any, any, any, any> = RxStore<K, V, any, any, any, any>>(
    store: S, config?: Omit<RxStoreSubscriberConfig<K, V, V>, 'observableTransformer'>
  ): RxStoreSubscriber<K, V, V, S>;
  static create<K, V, VI, S extends RxStore<K, VI, any, any, any, any> = RxStore<K, VI, any, any, any, any>>(
    store: S, config?: RxStoreSubscriberConfig<K, V, VI>
  ): RxStoreSubscriber<K, V, VI, S>;
  static create<K, V, VI, S extends RxStore<K, VI, any, any, any, any> = RxStore<K, VI, any, any, any, any>>(
    store: S, config?: Partial<RxStoreSubscriberConfig<K, V, VI>>
  ): RxStoreSubscriber<K, V, VI, S> {
    return new RxStoreSubscriber(store, Object.assign({
      observableTransformer: valueNoop,
    }, config));
  }

  protected constructor(protected store: S, config: RxStoreSubscriberConfig<K, V, VI>) {
    this.observableTransformerValue = config.observableTransformer;
    if ('key' in config) {
      this.key = config.key;
      this.subscribe();
    } else {
      this.key = rxBusNoValue;
    }
    this.setDestroyObservable(config.destroyObservable);
  }

  setKey(key: K): this {
    if (key !== this.key) {
      this.key = key;
      this.subscribe();
    }
    return this;
  }

  setObservableTransformer(observableTransformer: ObservableTransformer<VI, V>): this {
    if (observableTransformer !== this.observableTransformerValue) {
      this.observableTransformerValue = observableTransformer;
      this.subscribe();
    }
    return this;
  }

  setDestroyObservable(observable: Observable<any>): this {
    if (this.destroyObservableSubscription) {
      this.destroyObservableSubscription.unsubscribe();
    }
    this.destroyObservableSubscription = observable.pipe(finalize(() => {
      this.unsubscribe();
      if (this.destroyObservableSubscription) {
        this.destroyObservableSubscription.unsubscribe();
        this.destroyObservableSubscription = null;
      }
    })).subscribe();
    return this;
  }

  unsubscribe(): this {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.key = rxBusNoValue;
    return this;
  }

  private subscribe() {
    if (this.key === rxBusNoValue) {
      return;
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.subscription = this.observableTransformer(this.store.byKey.on(this.key)).subscribe(
      value => this.subject.next(value),
      () => this.unsubscribe(),
      () => this.unsubscribe(),
    );
  }
}
