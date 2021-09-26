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
});
