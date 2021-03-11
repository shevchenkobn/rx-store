import { Observable, Subject } from 'rxjs';
import { RxBusMetaEvent, RxBusMetaEventName, RxBusEmitter } from './types';

export abstract class RxBusBase<S extends Subject<V>, K, V> implements RxBusEmitter<K, V> {
  private subjects = new Map<K, S>();
  protected metaEventsSubject = new Subject<RxBusMetaEvent<S, K, V>>();
  metaEvents$ = this.metaEventsSubject.asObservable();

  constructor() {}

  on<T extends V = V>(key: K): Observable<T> {
    return this.getOrCreateSubject(key).asObservable() as Observable<T>;
  }

  emit(key: K, value: V): this {
    const subject = this.getOrCreateSubject(key) as Subject<V>;
    subject.next(value);
    return this;
  }

  isCompleted(key: K): boolean {
    return !this.subjects.has(key);
  }

  getNonCompletedKeys(): IterableIterator<K> {
    return this.subjects.keys();
  }

  complete(key: K): this {
    const subject = this.subjects.get(key);
    if (subject) {
      this.completeSubject(key, subject);
    }
    return this;
  }

  completeAll(): this {
    for (const [key, subject] of this.subjects) {
      this.completeSubject(key, subject);
    }
    return this;
  }

  /**
   * Final (sealed) method
   */
  protected getOrCreateSubject(key: K) {
    let subject = this.subjects.get(key);
    if (!subject) {
      subject = this.createSubject(key);
    }
    this.metaEventsSubject.next({
      key,
      observable: subject.asObservable(),
      type: RxBusMetaEventName.ObservableGet,
    });
    return subject;
  }

  /**
   * Final (sealed) method
   */
  protected createSubject(key: K) {
    const subject = this.doCreateSubject(key);
    this.subjects.set(key, subject);
    return subject;
  }

  protected abstract doCreateSubject(key: K): S;

  /**
   * Final (sealed) method
   */
  protected completeSubject(key: K, subject: S) {
    subject.complete();
    this.subjects.delete(key);
    this.metaEventsSubject.next({
      key,
      type: RxBusMetaEventName.ObservableComplete,
    });
  }
}
