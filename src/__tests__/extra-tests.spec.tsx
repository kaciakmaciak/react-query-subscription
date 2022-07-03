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

  const testInterval = 10;
  const finalizeFn = jest.fn();
  const test$ = interval(testInterval).pipe(finalize(finalizeFn));
  const testSubscriptionFn = jest.fn(() => test$);

  const testSubscriptionKey = 'test-subscription-key';

  afterEach(() => {
    testSubscriptionFn.mockClear();
    finalizeFn.mockClear();
  });

  describe('options', () => {
    // @todo: implement
    // describe.skip('initialData', () => {
    //   it('should support initial data value', async () => {
    //     const { result, waitForNextUpdate } = renderHook(
    //       () =>
    //         useSubscription(testSubscriptionKey, testSubscriptionFn, {
    //           initialData: 100,
    //         }),
    //       { wrapper: Wrapper }
    //     );
    //     expect(result.current.data).toBe(100);
    //     expect(result.current.status).toBe('success'); // ???
    //     await waitForNextUpdate();
    //     expect(result.current.data).toBe(0);
    //     expect(result.current.status).toBe('success');
    //   });
    // });
    // @todo: implement
    // describe.skip('enabled', () => {
    //   it('should not subscribe to the stream$ until enabled = true', async () => {
    //     const { result, rerender, waitFor, waitForNextUpdate } = renderHook(
    //       (options: UseSubscriptionOptions) =>
    //         useSubscription(testSubscriptionKey, testSubscriptionFn, options),
    //       { wrapper: Wrapper, initialProps: { enabled: false } }
    //     );
    //     expect(result.current.status).toBe('idle');
    //     rerender({ enabled: true });
    //     expect(result.current.status).toBe('loading');
    //     await waitFor(() => {
    //       expect(result.current.status).toBe('success');
    //     });
    //     expect(result.current.data).toBe(0);
    //     await waitForNextUpdate();
    //     expect(result.current.data).toBe(1);
    //     // ...
    //     rerender({ enabled: false });
    //     await waitForNextUpdate();
    //     expect(result.current.status).toBe('success'); // ???
    //     expect(result.current.data).toBe(1);
    //   });
    // });
  });

  test.skip('from EventStream', async () => {
    const seeSubscriptionFn = () => {
      const sse = new EventSource('http://localhost:8080/sse');
      return fromEvent<{ data: string }>(sse, 'message').pipe(
        map((message) => JSON.parse(message.data)),
        take(3),
        finalize(() => {
          sse.close();
        })
      );
    };

    const { result, waitForNextUpdate, unmount } = renderHook(
      () => useSubscription(testSubscriptionKey, seeSubscriptionFn),
      { wrapper: Wrapper }
    );
    expect(result.current.status).toBe('loading');

    await waitForNextUpdate({ timeout: 2000 });
    expect(result.current.status).toBe('success');

    expect(result.current.data.name).not.toBeFalsy();

    await waitForNextUpdate({ timeout: 2000 });
    expect(result.current.status).toBe('success');
    expect(result.current.data.name).not.toBeFalsy();

    await waitForNextUpdate({ timeout: 2000 });
    expect(result.current.status).toBe('success');
    expect(result.current.data.name).not.toBeFalsy();
  });
});
