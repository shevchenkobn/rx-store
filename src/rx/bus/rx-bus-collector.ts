import { Subject, Observable, Subscription, BehaviorSubject } from 'rxjs';
import { RxBusBase } from './rx-bus-base';
import { RxBusMetaEventName, defaultCollectorObservableTransformer, CollectorObservableTransformer } from './types';

export class RxBusCollector<K, V, T> {
  protected subject = new Subject<T>();
  readonly stream$ = this.subject.asObservable();
  protected subscriptions = new Map<K, Subscription>();
  private isSubscribedSubject = new BehaviorSubject<boolean>(false);
  readonly isSubscribed$ = this.isSubscribedSubject.asObservable();
  get isSubsribed() {
    return this.isSubscribedSubject.value;
  }
  private metaEventsSubscription: Subscription = null;

  static default<K, V>(bus: RxBusBase<Subject<V>, K, V>) {
    return new RxBusCollector(bus, defaultCollectorObservableTransformer);
  }

  constructor(
    protected bus: RxBusBase<Subject<V>, K, V>,
    protected observableTransformer: CollectorObservableTransformer<K, V, T>,
  ) {
    this.subscribe();
  }

  subscribe() {
    if (this.isSubsribed) {
      return;
    }
    for (const key of this.bus.getNonCompletedKeys()) {
      this.tryCreateSubscription(key, this.bus.on(key));
    }
    this.metaEventsSubscription = this.bus.metaEvents$.subscribe(event => {
      switch (event.type) {
        case RxBusMetaEventName.ObservableGet:
          this.tryCreateSubscription(event.key, event.observable);
          break;

        case RxBusMetaEventName.ObservableComplete:
          this.destroySubscription(event.key);
          break;
      }
    });
    this.isSubscribedSubject.next(true);
  }

  unsubscribe() {
    if (!this.isSubsribed) {
      return;
    }
    if (this.metaEventsSubscription) {
      this.metaEventsSubscription.unsubscribe();
      this.metaEventsSubscription = null;
    }
    for (const key of this.subscriptions.keys()) {
      this.destroySubscription(key);
    }
    this.isSubscribedSubject.next(false);
  }

  private tryCreateSubscription(key: K, stream: Observable<V>) {
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, this.observableTransformer(stream, key).subscribe(this.subject));
    }
  }

  private destroySubscription(key: K) {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(key);
    }
  }
}
