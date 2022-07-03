import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { interval, Subject } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { QueryClient, QueryClientProvider, QueryCache } from 'react-query';

import { useSubscription } from '../use-subscription';
import { useInfiniteSubscription } from '../use-infinite-subscription';

function mapToSelf<T>(data: T) {
  return data;
}
function mapToPages<T>(data: T) {
  return { pageParams: [undefined], pages: [data] };
}
function parsePage<T>(data: { pageParams: unknown[]; pages: T[] }) {
  return data.pages[0];
}

describe.each`
  hookName                     | useHook                    | resultDataFn  | parseDataFn
  ${'useSubscription'}         | ${useSubscription}         | ${mapToSelf}  | ${mapToSelf}
  ${'useInfiniteSubscription'} | ${useInfiniteSubscription} | ${mapToPages} | ${parsePage}
`('$hookName', ({ useHook, resultDataFn, parseDataFn }) => {
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

  function Wrapper({
    children,
  }: React.PropsWithChildren<Record<string, unknown>>) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  function subscriptionFnFactory<T>() {
    const testSubject = new Subject<T>();
    const finalizeFn = jest.fn();
    const subscriptionFn = jest.fn(() =>
      testSubject.asObservable().pipe(finalize(finalizeFn))
    );
    return {
      subscriptionFn,
      finalizeFn,
      next: (value: T) => testSubject.next(value),
      error: (error: Error) => testSubject.error(error),
    };
  }

  const testSubscriptionKey = 'test-subscription-key';

  test('subscription data and status', async () => {
    const { subscriptionFn, next } = subscriptionFnFactory<number>();
    const { result, waitForNextUpdate } = renderHook(
      () => useHook(testSubscriptionKey, subscriptionFn),
      { wrapper: Wrapper }
    );
    expect(result.current.data).toBeUndefined();
    expect(result.current.status).toBe('loading');

    next(1);
    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toEqual(resultDataFn(1));

    next(2);
    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toEqual(resultDataFn(2));
  });

  test('subscription error', async () => {
    const testErrorSubscriptionFn = () => {
      throw new Error('Test Error');
    };
    const onError = jest.fn();

    const { result, waitForNextUpdate } = renderHook(
      () =>
        useHook(testSubscriptionKey, testErrorSubscriptionFn, {
          onError,
        }),
      { wrapper: Wrapper }
    );
    expect(result.current.status).toBe('loading');
    expect(result.current.data).toBeUndefined();

    await waitForNextUpdate();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual(new Error('Test Error'));
    expect(result.current.failureCount).toBe(1);
    expect(result.current.data).toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(new Error('Test Error'));
  });

  test('emitted error', async () => {
    const { subscriptionFn, next, error } = subscriptionFnFactory<number>();

    const onError = jest.fn();
    const { result, waitForNextUpdate } = renderHook(
      () => useHook(testSubscriptionKey, subscriptionFn, { onError }),
      { wrapper: Wrapper }
    );
    expect(result.current.status).toBe('loading');
    expect(result.current.data).toBeUndefined();
    expect(subscriptionFn).toHaveBeenCalledTimes(1);
    subscriptionFn.mockClear();

    next(1);
    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toEqual(resultDataFn(1));

    next(2);
    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toEqual(resultDataFn(2));

    error(new Error('Test Error'));
    await waitForNextUpdate();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual(new Error('Test Error'));
    expect(result.current.failureCount).toBe(1);
    expect(result.current.data).toEqual(resultDataFn(2));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(new Error('Test Error'));

    expect(subscriptionFn).not.toHaveBeenCalled();
  });

  it('should subscribe on mount', async () => {
    const testSubject = new Subject<number>();
    const testSubscriptionFn = jest.fn(() => testSubject.asObservable());

    const { waitForNextUpdate, unmount } = renderHook(
      () => useHook(testSubscriptionKey, testSubscriptionFn),
      { wrapper: Wrapper }
    );
    expect(testSubscriptionFn).toHaveBeenCalledTimes(1);
    testSubscriptionFn.mockClear();

    testSubject.next(1);
    await waitForNextUpdate();
    expect(testSubscriptionFn).toHaveBeenCalledTimes(0);

    unmount();
    testSubject.next(2);
    expect(testSubscriptionFn).toHaveBeenCalledTimes(0);
  });

  it('should unsubscribe on unmount', async () => {
    const { subscriptionFn, finalizeFn, next } =
      subscriptionFnFactory<number>();

    const { waitForNextUpdate, unmount } = renderHook(
      () => useHook(testSubscriptionKey, subscriptionFn),
      { wrapper: Wrapper }
    );
    expect(finalizeFn).toHaveBeenCalledTimes(0);

    next(1);
    await waitForNextUpdate();
    expect(finalizeFn).toHaveBeenCalledTimes(0);

    unmount();
    next(2);
    expect(finalizeFn).toHaveBeenCalledTimes(1);
  });

  test('re-subscribe when mounted/unmounted/mounted', async () => {
    const { subscriptionFn, next } = subscriptionFnFactory<number>();
    const { result, waitForNextUpdate, unmount, rerender } = renderHook(
      () => useHook(testSubscriptionKey, subscriptionFn),
      { wrapper: Wrapper }
    );
    expect(result.current.status).toBe('loading');

    unmount();
    expect(subscriptionFn).toHaveBeenCalledTimes(1);
    subscriptionFn.mockClear();

    rerender();
    expect(result.current.status).toBe('loading');

    next(1);
    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toEqual(resultDataFn(1));

    next(2);
    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toEqual(resultDataFn(2));

    expect(subscriptionFn).toHaveBeenCalledTimes(1);
  });

  describe('multiple components subscribed to a different subscription key', () => {
    test('status and data when rendered the same time as first component', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();

      // First component
      renderHook(() => useHook('first-subscription-key', subscriptionFn), {
        wrapper: Wrapper,
      });

      const { result, waitForNextUpdate } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      expect(result.current.status).toBe('loading');
      expect(result.current.data).toBeUndefined();

      next(1);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(1));

      next(2);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(2));
    });

    test('status and data when rendered after the first component', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook('first-subscription-key', subscriptionFn),
        { wrapper: Wrapper }
      );

      next(1);
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { result, waitForNextUpdate } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      expect(result.current.status).toBe('loading');
      expect(result.current.data).toBeUndefined();

      next(2);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(2));

      next(3);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(3));
    });

    test('status and data after first component unmount', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook('first-subscription-key', subscriptionFn),
        { wrapper: Wrapper }
      );

      next(1);
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { result, waitFor, waitForNextUpdate } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );

      next(2);
      await waitFor(() => {
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(resultDataFn(2));
      });

      firstHookRender.unmount();

      next(3);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(3));
    });

    test('status and data after second component unmount', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook('first-subscription-key', subscriptionFn),
        { wrapper: Wrapper }
      );

      next(1);
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { waitFor, unmount } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );

      next(2);
      await waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
        expect(firstHookRender.result.current.data).toEqual(resultDataFn(2));
      });

      unmount();

      expect(firstHookRender.result.current.status).toBe('success');
      expect(firstHookRender.result.current.data).toEqual(resultDataFn(2));

      next(3);
      await firstHookRender.waitForNextUpdate();
      expect(firstHookRender.result.current.status).toBe('success');
      expect(firstHookRender.result.current.data).toEqual(resultDataFn(3));
    });

    test('status and data after first component error', async () => {
      const { subscriptionFn, error } = subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook('first-subscription-key', subscriptionFn),
        { wrapper: Wrapper }
      );
      expect(firstHookRender.result.current.status).toBe('loading');

      error(new Error('Test Error'));
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('error');
      });
      subscriptionFn.mockClear();

      const { result, waitForNextUpdate } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      expect(result.current.status).toBe('loading');
      expect(subscriptionFn).toHaveBeenCalledTimes(1);

      await waitForNextUpdate();
      expect(result.current.status).toBe('error');
    });

    it('should subscribe for both components', async () => {
      const { subscriptionFn } = subscriptionFnFactory<number>();

      renderHook(() => useHook('first-subscription-key', subscriptionFn), {
        wrapper: Wrapper,
      });

      expect(subscriptionFn).toHaveBeenCalledTimes(1);
      subscriptionFn.mockClear();

      renderHook(() => useHook(testSubscriptionKey, subscriptionFn), {
        wrapper: Wrapper,
      });
      expect(subscriptionFn).toHaveBeenCalledTimes(1);
    });

    it('should only unsubscribe on the second component unmount', async () => {
      const { subscriptionFn, finalizeFn, next } =
        subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook('first-subscription-key', subscriptionFn),
        { wrapper: Wrapper }
      );

      expect(finalizeFn).toHaveBeenCalledTimes(0);

      const { waitForNextUpdate, unmount } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      expect(finalizeFn).toHaveBeenCalledTimes(0);

      next(1);
      await waitForNextUpdate();
      expect(finalizeFn).toHaveBeenCalledTimes(0);

      unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
      finalizeFn.mockClear();

      firstHookRender.unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
    });

    it('should not re-subscribe when the first component unmount', async () => {
      const { subscriptionFn, finalizeFn, next } =
        subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook('first-subscription-key', subscriptionFn),
        { wrapper: Wrapper }
      );

      expect(subscriptionFn).toHaveBeenCalledTimes(1);
      subscriptionFn.mockClear();

      const { waitForNextUpdate, unmount } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      next(1);
      await waitForNextUpdate();
      expect(subscriptionFn).toHaveBeenCalledTimes(1);
      subscriptionFn.mockClear();

      firstHookRender.unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
      finalizeFn.mockClear();
      expect(subscriptionFn).toHaveBeenCalledTimes(0);

      unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple components subscribed to the same subscription key', () => {
    test('status and data when rendered the same time as first component', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();

      renderHook(() => useHook(testSubscriptionKey, subscriptionFn), {
        wrapper: Wrapper,
      });

      const { result, waitForNextUpdate } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      expect(result.current.status).toBe('loading');
      expect(result.current.data).toBeUndefined();

      next(1);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(1));

      next(2);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(2));
    });

    test('status and data when rendered after the first component', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );

      next(1);
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { result, waitForNextUpdate } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(1));

      next(2);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(2));
    });

    test('status and data after first component unmount', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );

      next(1);
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { result, waitFor, waitForNextUpdate } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );

      next(2);
      await waitFor(() => {
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(resultDataFn(2));
      });

      firstHookRender.unmount();

      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(2));

      next(3);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(3));
    });

    test('status and data after second component unmount', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );

      next(1);
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { result, waitFor, unmount } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );

      next(2);
      await waitFor(() => {
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(resultDataFn(2));
      });

      unmount();

      next(3);
      await firstHookRender.waitForNextUpdate();
      expect(firstHookRender.result.current.status).toBe('success');
      expect(firstHookRender.result.current.data).toEqual(resultDataFn(3));
    });

    test('status and data after first component error', async () => {
      const { subscriptionFn, error } = subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      expect(firstHookRender.result.current.status).toBe('loading');

      error(new Error('Test Error'));
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('error');
      });
      subscriptionFn.mockClear();

      const { result, waitForNextUpdate } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      expect(result.current.status).toBe('loading');
      expect(subscriptionFn).toHaveBeenCalledTimes(1);

      await waitForNextUpdate();
      expect(result.current.status).toBe('error');
    });

    it('should subscribe only on the first component mount', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();

      renderHook(() => useHook(testSubscriptionKey, subscriptionFn), {
        wrapper: Wrapper,
      });

      expect(subscriptionFn).toHaveBeenCalledTimes(1);
      subscriptionFn.mockClear();

      const { waitForNextUpdate } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      next(1);
      await waitForNextUpdate();
      expect(subscriptionFn).toHaveBeenCalledTimes(0);
    });

    it('should only unsubscribe on the second component unmount', async () => {
      const { subscriptionFn, finalizeFn, next } =
        subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );

      expect(finalizeFn).not.toHaveBeenCalled();

      const { waitForNextUpdate, unmount } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      expect(finalizeFn).not.toHaveBeenCalled();

      next(1);
      await waitForNextUpdate();
      expect(finalizeFn).not.toHaveBeenCalled();

      unmount();
      expect(finalizeFn).not.toHaveBeenCalled();

      firstHookRender.unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
    });

    it('should not re-subscribe when the first component unmount', async () => {
      const { subscriptionFn, finalizeFn, next } =
        subscriptionFnFactory<number>();

      const firstHookRender = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );

      expect(subscriptionFn).toHaveBeenCalledTimes(1);
      subscriptionFn.mockClear();

      const { waitForNextUpdate, unmount } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      next(1);
      await waitForNextUpdate();

      firstHookRender.unmount();
      expect(finalizeFn).not.toHaveBeenCalled();
      expect(subscriptionFn).not.toHaveBeenCalled();

      unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('options', () => {
    describe('enabled', () => {
      it('should be idle while enabled = false', async () => {
        const { subscriptionFn, finalizeFn, next } =
          subscriptionFnFactory<number>();
        const { result } = renderHook(
          () =>
            useHook(testSubscriptionKey, subscriptionFn, {
              enabled: false,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.status).toBe('idle');
        expect(result.current.data).toBeUndefined();

        next(1);
        // Give it chance to update (it should not).
        // The data should not be populated as enabled = false.
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(result.current.status).toBe('idle');
        expect(result.current.data).toBeUndefined();
        expect(finalizeFn).not.toHaveBeenCalled();
        expect(subscriptionFn).not.toHaveBeenCalled();
      });

      it('should load once enabled = true', async () => {
        const { subscriptionFn, next } = subscriptionFnFactory<number>();

        const { result, rerender, waitForNextUpdate } = renderHook(
          ({ enabled }) =>
            useHook(testSubscriptionKey, subscriptionFn, {
              enabled,
            }),
          { wrapper: Wrapper, initialProps: { enabled: false } }
        );
        expect(result.current.data).toBeUndefined();

        rerender({ enabled: true });

        await waitForNextUpdate();
        expect(result.current.status).toBe('loading');
        expect(result.current.data).toBeUndefined();

        next(1);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(resultDataFn(1));
      });
    });

    describe('retry', () => {
      it('should retry failed subscription 2 times', async () => {
        const testErrorSubscriptionFn = jest.fn(() => {
          throw new Error('Test Error');
        });

        const { result, waitFor } = renderHook(
          () =>
            useHook(testSubscriptionKey, testErrorSubscriptionFn, {
              retry: 2,
              retryDelay: 1,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.status).toBe('loading');
        expect(result.current.data).toBeUndefined();

        await waitFor(() => {
          expect(result.current.status).toBe('error');
        });
        expect(result.current.error).toEqual(new Error('Test Error'));
        expect(result.current.failureCount).toBe(3);
        expect(result.current.data).toBeUndefined();
        expect(testErrorSubscriptionFn).toHaveBeenCalledTimes(3);
      });

      it('should not retry subscription if successfully subscribed but error emitted', async () => {
        const { subscriptionFn, next, error } = subscriptionFnFactory<number>();
        const { result, waitForNextUpdate, waitFor } = renderHook(
          () =>
            useHook(testSubscriptionKey, subscriptionFn, {
              retry: 2,
              retryDelay: 1,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.status).toBe('loading');
        expect(result.current.data).toBeUndefined();
        expect(subscriptionFn).toHaveBeenCalledTimes(1);
        subscriptionFn.mockClear();

        next(1);
        next(2);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(subscriptionFn).not.toHaveBeenCalled();

        error(new Error('Test Error'));
        await waitFor(() => {
          expect(result.current.status).toBe('error');
        });
        expect(result.current.error).toEqual(new Error('Test Error'));
        // the queryFn runs 3x but the subscriptionFn is not called
        expect(result.current.failureCount).toBe(3);
        expect(result.current.data).toEqual(resultDataFn(1));
        expect(subscriptionFn).not.toHaveBeenCalled();
      });
    });

    describe('retryOnMount', () => {
      const testInterval = 10;
      const testErrorSubscriptionFn = () => {
        throw new Error('Test Error');
      };

      const testStreamErrorSubscriptionFn = () =>
        interval(testInterval).pipe(
          map((n) => {
            if (n === 2) {
              throw new Error('Test Error');
            }
            return n;
          })
        );

      it.each`
        subscriptionFn                   | hasPreviousData | description
        ${testErrorSubscriptionFn}       | ${false}        | ${`subscribe error`}
        ${testStreamErrorSubscriptionFn} | ${true}         | ${`stream error`}
      `(
        'should retry previously failed subscription ($description)',
        async ({ subscriptionFn, hasPreviousData }) => {
          const fn = jest.fn(() => subscriptionFn());
          const firstHookRender = renderHook(
            () =>
              useHook(testSubscriptionKey, fn, {
                retryOnMount: true,
              }),
            { wrapper: Wrapper }
          );
          await firstHookRender.waitFor(() => {
            expect(firstHookRender.result.current.status).toBe('error');
          });
          expect(fn).toHaveBeenCalledTimes(1);
          fn.mockClear();

          await new Promise((resolve) => setTimeout(resolve, 1000));

          const { result, unmount, waitFor } = renderHook(
            () =>
              useHook(testSubscriptionKey, fn, {
                retryOnMount: true,
              }),
            { wrapper: Wrapper }
          );
          expect(result.current.status).toBe('loading');
          if (hasPreviousData) {
            expect(result.current.data).toEqual(resultDataFn(1));
          } else {
            expect(result.current.data).toBeUndefined();
          }

          await waitFor(() => {
            expect(result.current.status).toBe('error');
          });
          expect(fn).toHaveBeenCalledTimes(1);

          firstHookRender.unmount();
          unmount();
        }
      );

      it.each`
        subscriptionFn                   | description
        ${testErrorSubscriptionFn}       | ${`failed to subscribe`}
        ${testStreamErrorSubscriptionFn} | ${`stream error`}
      `(
        'should not retry previously failed subscription ($description)',
        async ({ subscriptionFn }) => {
          const fn = jest.fn(() => subscriptionFn());
          const firstHookRender = renderHook(
            () =>
              useHook(testSubscriptionKey, fn, {
                retryOnMount: false,
              }),
            { wrapper: Wrapper }
          );
          await firstHookRender.waitFor(() => {
            expect(firstHookRender.result.current.status).toBe('error');
          });
          expect(fn).toHaveBeenCalledTimes(1);
          fn.mockClear();

          const { result, unmount } = renderHook(
            () =>
              useHook(testSubscriptionKey, fn, {
                retryOnMount: false,
              }),
            { wrapper: Wrapper }
          );
          expect(result.current.status).toBe('error');

          expect(fn).not.toHaveBeenCalled();
          expect(result.current.status).toBe('error');

          firstHookRender.unmount();
          unmount();
        }
      );
    });

    describe('select', () => {
      it('should apply select function', async () => {
        const { subscriptionFn, next } = subscriptionFnFactory<number>();
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useHook(testSubscriptionKey, subscriptionFn, {
              select: (data: number) => resultDataFn(10 * parseDataFn(data)),
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.data).toBeUndefined();

        next(1);
        await waitForNextUpdate();
        expect(result.current.data).toEqual(resultDataFn(10));

        next(2);
        await waitForNextUpdate();
        expect(result.current.data).toEqual(resultDataFn(20));
      });
    });

    describe('placeholderData', () => {
      it('should support placeholder data', async () => {
        const { subscriptionFn, next } = subscriptionFnFactory<number>();
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useHook(testSubscriptionKey, subscriptionFn, {
              placeholderData: resultDataFn(100),
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(resultDataFn(100));

        next(1);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(resultDataFn(1));

        next(2);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(resultDataFn(2));
      });
    });

    describe('onData', () => {
      test('subscription data and status', async () => {
        const { subscriptionFn, next } = subscriptionFnFactory<number>();

        const onData = jest.fn();
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useHook(testSubscriptionKey, subscriptionFn, {
              onData,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.data).toBeUndefined();
        expect(result.current.status).toBe('loading');

        next(1);
        await waitForNextUpdate();
        expect(result.current.data).toEqual(resultDataFn(1));
        expect(result.current.status).toBe('success');
        expect(onData).toHaveBeenCalledTimes(1);
        expect(onData).toHaveBeenCalledWith(resultDataFn(1));

        next(2);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(resultDataFn(2));
        expect(onData).toHaveBeenCalledTimes(2);
        expect(onData).toHaveBeenCalledWith(resultDataFn(2));
      });
    });
  });

  describe('returns', () => {
    test('refetch', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();
      const { result, waitForNextUpdate, unmount } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      next(2);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(2));
      expect(subscriptionFn).toHaveBeenCalledTimes(1);
      const refetchPromise = result.current.refetch();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(2));

      next(1);
      await refetchPromise;
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(1));

      expect(subscriptionFn).toHaveBeenCalledTimes(2);
      unmount();
    });
  });

  describe('queryClient', () => {
    test('invalidateQueries', async () => {
      const { subscriptionFn, next } = subscriptionFnFactory<number>();
      const { result, waitForNextUpdate, unmount } = renderHook(
        () => useHook(testSubscriptionKey, subscriptionFn),
        { wrapper: Wrapper }
      );
      next(1);
      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(1));
      expect(subscriptionFn).toHaveBeenCalledTimes(1);

      queryClient.invalidateQueries(testSubscriptionKey);
      expect(result.current.status).toBe('success');
      expect(result.current.data).toEqual(resultDataFn(1));

      expect(subscriptionFn).toHaveBeenCalledTimes(2);
      unmount();
    });
  });
});
