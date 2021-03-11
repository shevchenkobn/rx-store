import { Subject } from 'rxjs';
import { RxBusBase } from './rx-bus-base';

export class RxBus<K, V> extends RxBusBase<Subject<V>, K, V> {
  protected doCreateSubject(key: K) {
    return new Subject<V>();
  }
}
