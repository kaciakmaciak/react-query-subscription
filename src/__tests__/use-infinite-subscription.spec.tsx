import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Subject } from 'rxjs';
import { finalize, filter } from 'rxjs/operators';
import { QueryClient, QueryClientProvider, QueryCache } from 'react-query';

import { useInfiniteSubscription } from '../use-infinite-subscription';

describe('useInfiniteSubscription', () => {
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

  function subscriptionFnFactory() {
    const testSubject = new Subject<number>();
    const finalizeFn = jest.fn();
    const subscriptionFn = jest.fn(({ pageParam = 0 }) =>
      testSubject.asObservable().pipe(
        filter((data) => data >= pageParam * 10 && data < (pageParam + 1) * 10),
        finalize(finalizeFn)
      )
    );
    return {
      subscriptionFn,
      finalizeFn,
      next: (value: number) => testSubject.next(value),
      error: (error: Error) => testSubject.error(error),
    };
  }

  const testSubscriptionKey = 'test-subscription-key';

  function mapToPages<T>(data: T) {
    return { pageParams: [undefined], pages: [data] };
  }

  describe('options', () => {
    describe('getNextPageParam', () => {
      test('fetching next page', async () => {
        const { subscriptionFn, next } = subscriptionFnFactory();

        const getNextPageParam = jest.fn(
          (_lastPage, allPages) => allPages.length
        );
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useInfiniteSubscription(testSubscriptionKey, subscriptionFn, {
              getNextPageParam,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.data).toBeUndefined();
        expect(result.current.status).toBe('loading');
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(getNextPageParam).not.toHaveBeenCalled();

        next(1);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(mapToPages(1));

        expect(result.current.hasNextPage).toBe(true);

        result.current.fetchNextPage();
        expect(getNextPageParam).toHaveBeenCalledWith(1, [1]);

        await waitForNextUpdate();
        expect(result.current.isFetchingNextPage).toBe(true);
        expect(result.current.data).toEqual(mapToPages(1));
        expect(result.current.status).toBe('success');

        next(12);
        await waitForNextUpdate();
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual({
          pageParams: [undefined, 1],
          pages: [1, 12],
        });

        expect(result.current.hasNextPage).toBe(true);

        result.current.fetchNextPage();
        expect(getNextPageParam).toHaveBeenCalledWith(12, [1, 12]);

        await waitForNextUpdate();
        expect(result.current.isFetchingNextPage).toBe(true);

        next(23);
        await waitForNextUpdate();
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual({
          pageParams: [undefined, 1, 2],
          pages: [1, 12, 23],
        });
      });

      it('should have no next page', async () => {
        const { subscriptionFn, next } = subscriptionFnFactory();

        const getNextPageParam = jest.fn(() => undefined);
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useInfiniteSubscription(testSubscriptionKey, subscriptionFn, {
              getNextPageParam,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.data).toBeUndefined();
        expect(result.current.status).toBe('loading');
        expect(getNextPageParam).not.toHaveBeenCalled();

        next(1);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(mapToPages(1));

        expect(result.current.hasNextPage).toBe(false);

        result.current.fetchNextPage();
        expect(getNextPageParam).toHaveBeenCalledWith(1, [1]);

        await waitForNextUpdate();
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(result.current.data).toEqual(mapToPages(1));
        expect(result.current.status).toBe('success');

        next(2);
        await waitForNextUpdate();
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(mapToPages(2));
      });

      test('updating previously subscribed pages', async () => {
        const { subscriptionFn, next } = subscriptionFnFactory();

        const getNextPageParam = jest.fn(
          (_lastPage, allPages) => allPages.length
        );
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useInfiniteSubscription(testSubscriptionKey, subscriptionFn, {
              getNextPageParam,
            }),
          { wrapper: Wrapper }
        );

        next(1);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(mapToPages(1));

        expect(result.current.hasNextPage).toBe(true);

        result.current.fetchNextPage();
        await waitForNextUpdate();
        expect(result.current.isFetchingNextPage).toBe(true);
        expect(result.current.data).toEqual(mapToPages(1));
        expect(result.current.status).toBe('success');

        next(12);
        await waitForNextUpdate();
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual({
          pageParams: [undefined, 1],
          pages: [1, 12],
        });

        next(2);
        await waitForNextUpdate();
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual({
          pageParams: [undefined, 1],
          pages: [2, 12],
        });

        next(13);
        await waitForNextUpdate();
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual({
          pageParams: [undefined, 1],
          pages: [2, 13],
        });
      });
    });

    describe('getPreviousPageParam', () => {
      test('fetching previous page', async () => {
        const { subscriptionFn, next } = subscriptionFnFactory();

        const getPreviousPageParam = jest.fn(
          (_lastPage, allPages) => allPages.length
        );
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useInfiniteSubscription(testSubscriptionKey, subscriptionFn, {
              getPreviousPageParam,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.data).toBeUndefined();
        expect(result.current.status).toBe('loading');
        expect(result.current.isFetchingPreviousPage).toBe(false);
        expect(getPreviousPageParam).not.toHaveBeenCalled();

        next(1);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(mapToPages(1));

        expect(result.current.hasPreviousPage).toBe(true);

        result.current.fetchPreviousPage();
        expect(getPreviousPageParam).toHaveBeenCalledWith(1, [1]);

        await waitForNextUpdate();
        expect(result.current.isFetchingPreviousPage).toBe(true);
        expect(result.current.data).toEqual(mapToPages(1));
        expect(result.current.status).toBe('success');

        next(12);
        await waitForNextUpdate();
        expect(result.current.isFetchingPreviousPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual({
          pageParams: [1, undefined],
          pages: [12, 1],
        });

        expect(result.current.hasPreviousPage).toBe(true);

        result.current.fetchPreviousPage();
        expect(getPreviousPageParam).toHaveBeenCalledWith(12, [12, 1]);

        await waitForNextUpdate();
        expect(result.current.isFetchingPreviousPage).toBe(true);

        next(23);
        await waitForNextUpdate();
        expect(result.current.isFetchingPreviousPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual({
          pageParams: [2, 1, undefined],
          pages: [23, 12, 1],
        });
      });

      it('should have no previous page', async () => {
        const { subscriptionFn, next } = subscriptionFnFactory();

        const getPreviousPageParam = jest.fn(() => undefined);
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useInfiniteSubscription(testSubscriptionKey, subscriptionFn, {
              getPreviousPageParam,
            }),
          { wrapper: Wrapper }
        );
        expect(result.current.data).toBeUndefined();
        expect(result.current.status).toBe('loading');
        expect(getPreviousPageParam).not.toHaveBeenCalled();

        next(1);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(mapToPages(1));

        expect(result.current.hasPreviousPage).toBe(false);

        result.current.fetchPreviousPage();
        expect(getPreviousPageParam).toHaveBeenCalledWith(1, [1]);

        await waitForNextUpdate();
        expect(result.current.isFetchingPreviousPage).toBe(false);
        expect(result.current.data).toEqual(mapToPages(1));
        expect(result.current.status).toBe('success');

        next(2);
        await waitForNextUpdate();
        expect(result.current.isFetchingPreviousPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(mapToPages(2));
      });

      test('updating previously subscribed pages', async () => {
        const { subscriptionFn, next } = subscriptionFnFactory();

        const getPreviousPageParam = jest.fn(
          (_lastPage, allPages) => allPages.length
        );
        const { result, waitForNextUpdate } = renderHook(
          () =>
            useInfiniteSubscription(testSubscriptionKey, subscriptionFn, {
              getPreviousPageParam,
            }),
          { wrapper: Wrapper }
        );

        next(1);
        await waitForNextUpdate();
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(mapToPages(1));

        expect(result.current.hasPreviousPage).toBe(true);

        result.current.fetchPreviousPage();
        await waitForNextUpdate();
        expect(result.current.isFetchingPreviousPage).toBe(true);
        expect(result.current.data).toEqual(mapToPages(1));
        expect(result.current.status).toBe('success');

        next(12);
        await waitForNextUpdate();
        expect(result.current.isFetchingPreviousPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual({
          pageParams: [1, undefined],
          pages: [12, 1],
        });

        next(2);
        await waitForNextUpdate();
        expect(result.current.isFetchingPreviousPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual({
          pageParams: [1, undefined],
          pages: [12, 2],
        });

        next(13);
        await waitForNextUpdate();
        expect(result.current.isFetchingPreviousPage).toBe(false);
        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual({
          pageParams: [1, undefined],
          pages: [13, 2],
        });
      });
    });
  });
});
