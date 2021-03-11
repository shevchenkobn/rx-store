import { BehaviorSubject } from 'rxjs';
import { RxBusBase } from './rx-bus-base';
import { RxBusValueFactory } from './types';

export class BehaviourRxBus<K, V> extends RxBusBase<BehaviorSubject<V>, K, V> {
  initialValueFactory: RxBusValueFactory<K, V>;

  constructor(initialValueGetter: RxBusValueFactory<K, V>) {
    super();
    this.initialValueFactory = initialValueGetter;
  }

  getValue<T extends V = V>(key: K): T {
    return this.getOrCreateSubject(key).getValue() as T;
  }

  protected doCreateSubject(key: K) {
    return new BehaviorSubject(this.initialValueFactory(key));
  }
}
