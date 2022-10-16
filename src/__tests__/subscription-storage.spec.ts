import { Subject } from 'rxjs';
import { QueryClient, QueryCache } from 'react-query';

import {
  storeSubscription,
  cleanupSubscription,
} from '../subscription-storage';

describe('subscription storage', () => {
  let queryCache: QueryCache;
  let queryClient: QueryClient;

  beforeEach(() => {
    queryCache = new QueryCache();
    queryClient = new QueryClient({
      queryCache,
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryCache.clear();
  });

  function subscriptionFactory<T>(observerFn?: (value: T) => void) {
    const subject = new Subject<T>();
    const subscription = subject.asObservable().subscribe(observerFn);
    return {
      subscription,
      next: (value: T) => subject.next(value),
      observerFn,
    };
  }

  test('store and cleanup subscription', () => {
    const observerFn = jest.fn();
    const { subscription, next } = subscriptionFactory(observerFn);

    storeSubscription(queryClient, 'test', subscription);

    next('value-1');
    expect(observerFn).toHaveBeenCalledTimes(1);
    expect(observerFn).toHaveBeenCalledWith('value-1');
    observerFn.mockClear();

    cleanupSubscription(queryClient, 'test');

    next('value-2');
    expect(observerFn).not.toHaveBeenCalled();
  });

  test('only unsubscribes the specified subscription', () => {
    const observerAFn = jest.fn();
    const { subscription: subscriptionA, next: nextA } =
      subscriptionFactory(observerAFn);
    const observerBFn = jest.fn();
    const { subscription: subscriptionB, next: nextB } =
      subscriptionFactory(observerBFn);

    storeSubscription(queryClient, 'testA', subscriptionA);
    storeSubscription(queryClient, 'testB', subscriptionB);

    nextA('A1');
    expect(observerAFn).toHaveBeenCalledTimes(1);
    expect(observerAFn).toHaveBeenCalledWith('A1');
    observerAFn.mockClear();
    nextB('B1');
    expect(observerBFn).toHaveBeenCalledTimes(1);
    expect(observerBFn).toHaveBeenCalledWith('B1');
    observerBFn.mockClear();

    cleanupSubscription(queryClient, 'testA');

    nextA('A2');
    expect(observerAFn).not.toHaveBeenCalled();
    nextB('B2');
    expect(observerBFn).toHaveBeenCalledTimes(1);
    expect(observerBFn).toHaveBeenCalledWith('B2');
  });

  it('should not fail when key does not exist', () => {
    expect(() =>
      cleanupSubscription(queryClient, 'test-non-existing')
    ).not.toThrow();
  });
});
