import React from 'react';
import { renderHook, RenderHookResult } from '@testing-library/react-hooks';
import { interval, fromEvent } from 'rxjs';
import { take, map, finalize } from 'rxjs/operators';
import { QueryClient, QueryClientProvider, QueryCache } from 'react-query';

import {
  useSubscription,
  UseSubscriptionOptions,
  UseSubscriptionResult,
} from '../use-subscription';

describe('useSubscription', () => {
  let queryCache: QueryCache;
  let queryClient: QueryClient;

  beforeEach(() => {
    queryCache = new QueryCache();
    queryClient = new QueryClient({
      queryCache,
      defaultOptions: {
        queries: { retry: 0 },
      },
    });
  });

  afterEach(() => {
    queryCache.clear();
  });

  function Wrapper({
    children,
  }: React.PropsWithChildren<Record<string, never>>) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  let consoleErrorSpy: jest.SpyInstance;

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  const finalizeFn = jest.fn();
  const test$ = interval(10).pipe(finalize(finalizeFn));
  const testSubscriptionFn = jest.fn(() => test$);

  const testSubscriptionKey = 'test-subscription-key';

  afterEach(() => {
    testSubscriptionFn.mockClear();
    finalizeFn.mockClear();
  });

  it('should have correct status', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useSubscription(testSubscriptionKey, testSubscriptionFn),
      { wrapper: Wrapper }
    );
    expect(result.current.status).toBe('loading');

    await waitForNextUpdate();
    expect(result.current.status).toBe('success');

    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
  });

  it('should have correct data', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useSubscription(testSubscriptionKey, testSubscriptionFn),
      { wrapper: Wrapper }
    );
    expect(result.current.data).toBeUndefined();

    await waitForNextUpdate();
    expect(result.current.data).toBe(0);

    await waitForNextUpdate();
    expect(result.current.data).toBe(1);
  });

  test('subscription error', async () => {
    const testErrorSubscriptionFn = () => {
      throw new Error('Test Error');
    };

    const { result, waitForNextUpdate } = renderHook(
      () => useSubscription(testSubscriptionKey, testErrorSubscriptionFn),
      { wrapper: Wrapper }
    );
    expect(result.current.status).toBe('loading');
    expect(result.current.data).toBeUndefined();

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await waitForNextUpdate();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual(new Error('Test Error'));
    expect(result.current.failureCount).toBe(1);
    expect(result.current.data).toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  test('emitted error', async () => {
    const testErrorSubscriptionFn = () =>
      interval(10).pipe(
        map((n) => {
          if (n === 2) {
            throw new Error('Test Error');
          }
          return n;
        })
      );

    const { result, waitForNextUpdate } = renderHook(
      () => useSubscription(testSubscriptionKey, testErrorSubscriptionFn),
      { wrapper: Wrapper }
    );
    expect(result.current.status).toBe('loading');
    expect(result.current.data).toBeUndefined();

    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe(0);

    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe(1);

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await waitForNextUpdate();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual(new Error('Test Error'));
    expect(result.current.failureCount).toBe(1);
    expect(result.current.data).toBe(1);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('should subscribe on mount', async () => {
    const { waitForNextUpdate, unmount } = renderHook(
      () => useSubscription(testSubscriptionKey, testSubscriptionFn),
      { wrapper: Wrapper }
    );
    expect(testSubscriptionFn).toHaveBeenCalledTimes(1);
    testSubscriptionFn.mockClear();

    await waitForNextUpdate();
    expect(testSubscriptionFn).toHaveBeenCalledTimes(0);

    unmount();
    expect(testSubscriptionFn).toHaveBeenCalledTimes(0);
  });

  it('should unsubscribe on unmount', async () => {
    const { waitForNextUpdate, unmount } = renderHook(
      () => useSubscription(testSubscriptionKey, testSubscriptionFn),
      { wrapper: Wrapper }
    );
    expect(finalizeFn).toHaveBeenCalledTimes(0);

    await waitForNextUpdate();
    expect(finalizeFn).toHaveBeenCalledTimes(0);

    unmount();
    expect(finalizeFn).toHaveBeenCalledTimes(1);
  });
});
