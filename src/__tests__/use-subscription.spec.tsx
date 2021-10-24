import React from 'react';
import { renderHook, RenderHookResult } from '@testing-library/react-hooks';
import { interval } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
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
        queries: { retry: false },
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

  const testInterval = 10;
  const finalizeFn = jest.fn();
  const test$ = interval(testInterval).pipe(finalize(finalizeFn));
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

    await waitForNextUpdate();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual(new Error('Test Error'));
    expect(result.current.failureCount).toBe(1);
    expect(result.current.data).toBeUndefined();
  });

  test('emitted error', async () => {
    const testErrorSubscriptionFn = jest.fn(() =>
      interval(testInterval).pipe(
        map((n) => {
          if (n === 2) {
            throw new Error('Test Error');
          }
          return n;
        })
      ));

    const { result, waitForNextUpdate } = renderHook(
      () => useSubscription(testSubscriptionKey, testErrorSubscriptionFn),
      { wrapper: Wrapper }
    );
    expect(result.current.status).toBe('loading');
    expect(result.current.data).toBeUndefined();
    expect(testErrorSubscriptionFn).toHaveBeenCalledTimes(1);
    testErrorSubscriptionFn.mockClear();

    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe(0);

    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe(1);

    await waitForNextUpdate();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual(new Error('Test Error'));
    expect(result.current.failureCount).toBe(1);
    expect(result.current.data).toBe(1);

    expect(testErrorSubscriptionFn).not.toHaveBeenCalled();
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

  test('re-subscribe when mounted/unmounted/mounted', async () => {
    const { result, waitForNextUpdate, unmount, rerender } = renderHook(
      () => useSubscription(testSubscriptionKey, testSubscriptionFn),
      { wrapper: Wrapper }
    );
    expect(result.current.status).toBe('loading');

    unmount();
    expect(testSubscriptionFn).toHaveBeenCalledTimes(1);
    testSubscriptionFn.mockClear();

    rerender();
    expect(result.current.status).toBe('loading');

    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe(0);

    await waitForNextUpdate();
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe(1);

    expect(testSubscriptionFn).toHaveBeenCalledTimes(1);
  });

  describe('multiple components subscribed to a different subscription key', () => {
    let firstHookRender: RenderHookResult<
      UseSubscriptionOptions,
      UseSubscriptionResult
    >;

    beforeEach(() => {
      firstHookRender = renderHook(
        (options: UseSubscriptionOptions) =>
          useSubscription(
            'first-subscription-key',
            testSubscriptionFn,
            options
          ),
        { wrapper: Wrapper }
      );
    });

    afterEach(() => {
      firstHookRender.unmount();
    });

    test('status and data when rendered the same time as first component', async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
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
    });

    test('status and data when rendered after the first component', async () => {
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { result, waitForNextUpdate } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
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
    });

    test('status and data after first component unmount', async () => {
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { result, waitFor, waitForNextUpdate } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe(1);
      });

      firstHookRender.unmount();

      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toBe(2);
    });

    test('status and data after second component unmount', async () => {
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { waitFor, unmount } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
        expect(firstHookRender.result.current.data).toBe(1);
      });

      unmount();

      expect(firstHookRender.result.current.status).toBe('success');
      expect(firstHookRender.result.current.data).toBe(1);

      await firstHookRender.waitForNextUpdate();
      expect(firstHookRender.result.current.status).toBe('success');
      expect(firstHookRender.result.current.data).toBe(2);
    });

    it('should subscribe for both components', async () => {
      expect(testSubscriptionFn).toHaveBeenCalledTimes(1);
      testSubscriptionFn.mockClear();

      const { waitForNextUpdate } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );
      await waitForNextUpdate();
      expect(testSubscriptionFn).toHaveBeenCalledTimes(1);
    });

    it('should only unsubscribe on the second component unmount', async () => {
      expect(finalizeFn).toHaveBeenCalledTimes(0);

      const { waitForNextUpdate, unmount } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );
      expect(finalizeFn).toHaveBeenCalledTimes(0);

      await waitForNextUpdate();
      expect(finalizeFn).toHaveBeenCalledTimes(0);

      unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
      finalizeFn.mockClear();

      firstHookRender.unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
    });

    it('should not re-subscribe when the first component unmount', async () => {
      expect(testSubscriptionFn).toHaveBeenCalledTimes(1);
      testSubscriptionFn.mockClear();

      const { waitForNextUpdate, unmount } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );
      await waitForNextUpdate();
      expect(testSubscriptionFn).toHaveBeenCalledTimes(1);
      testSubscriptionFn.mockClear();

      firstHookRender.unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
      finalizeFn.mockClear();
      expect(testSubscriptionFn).toHaveBeenCalledTimes(0);

      unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple components subscribed to the same subscription key', () => {
    let firstHookRender: RenderHookResult<
      UseSubscriptionOptions,
      UseSubscriptionResult
    >;

    beforeEach(() => {
      firstHookRender = renderHook(
        (options: UseSubscriptionOptions) =>
          useSubscription(testSubscriptionKey, testSubscriptionFn, options),
        { wrapper: Wrapper }
      );
    });

    afterEach(() => {
      firstHookRender.unmount();
    });

    test('status and data when rendered the same time as first component', async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
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
    });

    test('status and data when rendered after the first component', async () => {
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { result, waitForNextUpdate } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );
      expect(result.current.status).toBe('success');
      expect(result.current.data).toBe(0);

      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toBe(1);
    });

    test('status and data after first component unmount', async () => {
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { result, waitFor, waitForNextUpdate } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe(1);
      });

      firstHookRender.unmount();

      expect(result.current.status).toBe('success');
      expect(result.current.data).toBe(1);

      await waitForNextUpdate();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toBe(2);
    });

    test('status and data after second component unmount', async () => {
      await firstHookRender.waitFor(() => {
        expect(firstHookRender.result.current.status).toBe('success');
      });

      const { result, waitFor, unmount } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe(1);
      });

      unmount();

      await firstHookRender.waitForNextUpdate();
      expect(firstHookRender.result.current.status).toBe('success');
      expect(firstHookRender.result.current.data).toBe(2);
    });

    it('should subscribe only on the first component mount', async () => {
      expect(testSubscriptionFn).toHaveBeenCalledTimes(1);
      testSubscriptionFn.mockClear();

      const { waitForNextUpdate } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );
      await waitForNextUpdate();
      expect(testSubscriptionFn).toHaveBeenCalledTimes(0);
    });

    it('should only unsubscribe on the second component unmount', async () => {
      expect(finalizeFn).toHaveBeenCalledTimes(0);

      const { waitForNextUpdate, unmount } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );
      expect(finalizeFn).toHaveBeenCalledTimes(0);

      await waitForNextUpdate();
      expect(finalizeFn).toHaveBeenCalledTimes(0);

      unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(0);

      firstHookRender.unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
    });

    it('should not re-subscribe when the first component unmount', async () => {
      expect(testSubscriptionFn).toHaveBeenCalledTimes(1);
      testSubscriptionFn.mockClear();

      const { waitForNextUpdate, unmount } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );
      await waitForNextUpdate();

      firstHookRender.unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(0);
      expect(testSubscriptionFn).toHaveBeenCalledTimes(0);

      unmount();
      expect(finalizeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('options', () => {
    describe('enabled', () => {
      it('should be idle while enabled = false', async () => {
        const { result } = renderHook(
          () =>
            useSubscription(testSubscriptionKey, testSubscriptionFn, {
              enabled: false,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.status).toBe('idle');
        expect(result.current.data).toBeUndefined();

        // Wait for the test interval amount of time.
        // The data should not be populated as enabled = false.
        await new Promise((resolve) => setTimeout(resolve, 2 * testInterval));

        expect(result.current.status).toBe('idle');
        expect(result.current.data).toBeUndefined();
        expect(finalizeFn).toHaveBeenCalledTimes(0);
        expect(testSubscriptionFn).toHaveBeenCalledTimes(0);
      });

      it('should load once enabled = true', async () => {
        const { result, rerender, waitForNextUpdate } = renderHook(
          ({ enabled }: UseSubscriptionOptions) =>
            useSubscription(testSubscriptionKey, testSubscriptionFn, {
              enabled,
            }),
          { wrapper: Wrapper, initialProps: { enabled: false } }
        );
        expect(result.current.data).toBeUndefined();

        rerender({ enabled: true });

        await waitForNextUpdate();
        expect(result.current.status).toBe('loading');
        expect(result.current.data).toBeUndefined();

        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe(0);
      });
    });

    describe('retry', () => {
      it('should retry failed subscription 2 times', async () => {
        const testErrorSubscriptionFn = jest.fn(() => {
          throw new Error('Test Error');
        });
    
        const { result, waitFor } = renderHook(
          () =>
            useSubscription(testSubscriptionKey, testErrorSubscriptionFn, {
              retry: 2,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.status).toBe('loading');
        expect(result.current.data).toBeUndefined();

        await waitFor(() => {
          expect(result.current.status).toBe('error');
        }, { timeout: 10000 });
        expect(result.current.error).toEqual(new Error('Test Error'));
        expect(result.current.failureCount).toBe(3);
        expect(result.current.data).toBeUndefined();
        expect(testErrorSubscriptionFn).toHaveBeenCalledTimes(3);
      });

      it('should not retry subscription if successfully subscribed but error emitted', async () => {
        const testErrorSubscriptionFn = jest.fn(() =>
          interval(testInterval).pipe(
            map((n) => {
              if (n === 2) {
                throw new Error('Test Error');
              }
              return n;
            })
          ));
    
        const { result, waitFor } = renderHook(
          () =>
            useSubscription(testSubscriptionKey, testErrorSubscriptionFn, {
              retry: 2,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.status).toBe('loading');
        expect(result.current.data).toBeUndefined();
        expect(testErrorSubscriptionFn).toHaveBeenCalledTimes(1);
        testErrorSubscriptionFn.mockClear();
    
        await waitFor(() => {
          expect(result.current.status).toBe('error');
        }, { timeout: 10000 });
        expect(result.current.error).toEqual(new Error('Test Error'));
         // the queryFn runs 3x but the subscriptionFn is not called
        expect(result.current.failureCount).toBe(3);
        expect(result.current.data).toBe(1);
        expect(testErrorSubscriptionFn).not.toHaveBeenCalled();
      });
    });

    describe('retryOnMount', () => {
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
      `('should retry previously failed subscription ($description)', async ({ subscriptionFn, hasPreviousData }) => {
        const fn = jest.fn(() => subscriptionFn());
        const firstHookRender = renderHook(
          () =>
            useSubscription(testSubscriptionKey, fn, {
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
            useSubscription(testSubscriptionKey, fn, {
              retryOnMount: true,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.status).toBe('loading');
        if (hasPreviousData) {
          expect(result.current.data).toBe(1);
        } else {
          expect(result.current.data).toBeUndefined();
        }

        await waitFor(() => {
          expect(result.current.status).toBe('error');
        });
        expect(fn).toHaveBeenCalledTimes(1);

        firstHookRender.unmount();
        unmount();
      });

      it.each`
        subscriptionFn                   | description
        ${testErrorSubscriptionFn}       | ${`failed to subscribe`}
        ${testStreamErrorSubscriptionFn} | ${`stream error`}
      `('should not retry previously failed subscription ($description)', async ({ subscriptionFn }) => {
        const fn = jest.fn(() => subscriptionFn());
        const firstHookRender = renderHook(
          () =>
            useSubscription(testSubscriptionKey, fn, {
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
            useSubscription(testSubscriptionKey, fn, {
              retryOnMount: false,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.status).toBe('error');

        expect(fn).not.toHaveBeenCalled();
        expect(result.current.status).toBe('error');

        firstHookRender.unmount();
        unmount();
      });
    });

    describe('select', () => {
      it('should apply select function', async () => {
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useSubscription(testSubscriptionKey, testSubscriptionFn, {
              select: (data) => 10 * (data + 1),
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.data).toBeUndefined();

        await waitForNextUpdate();
        expect(result.current.data).toBe(10);

        await waitForNextUpdate();
        expect(result.current.data).toBe(20);
      });
    });

    describe('placeholderData', () => {
      it('should support placeholder data', async () => {
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useSubscription(testSubscriptionKey, testSubscriptionFn, {
              placeholderData: 100,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe(100);

        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe(0);

        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe(1);
      });
    });
  });

  describe('returns', () => {
    test('refetch', async () => {
      const { result, waitFor, unmount } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );
      await waitFor(() => {
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe(1);
      });
      expect(testSubscriptionFn).toHaveBeenCalledTimes(1);

      const refetchPromise = result.current.refetch();
      expect(result.current.status).toBe('success');
      expect(result.current.data).toBe(1);

      await refetchPromise;
      expect(result.current.status).toBe('success');
      expect(result.current.data).toBe(0);

      expect(testSubscriptionFn).toHaveBeenCalledTimes(2);
      unmount();
    });
  });

  describe('queryClient', () => {
    test('invalidateQueries', async () => {
      const { result, waitFor, unmount } = renderHook(
        () => useSubscription(testSubscriptionKey, testSubscriptionFn),
        { wrapper: Wrapper }
      );
      await waitFor(() => {
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe(1);
      });
      expect(testSubscriptionFn).toHaveBeenCalledTimes(1);

      queryClient.invalidateQueries(testSubscriptionKey);
      expect(result.current.status).toBe('success');
      expect(result.current.data).toBe(1);

      await waitFor(() => {
        expect(result.current.status).toBe('success');
        expect(result.current.data).toBe(0);
      });
      expect(testSubscriptionFn).toHaveBeenCalledTimes(2);
      unmount();
    });
  });
});
