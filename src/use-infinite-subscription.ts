import { useEffect } from 'react';
import {
  hashQueryKey,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  QueryKey,
  UseInfiniteQueryResult,
  PlaceholderDataFunction,
  QueryFunctionContext,
  InfiniteData,
  GetPreviousPageParamFunction,
  GetNextPageParamFunction,
} from '@tanstack/react-query';
import type {
  RetryDelayValue,
  RetryValue,
} from '@tanstack/query-core/build/lib/retryer';
import { Observable } from 'rxjs';

import { useObservableQueryFn } from './use-observable-query-fn';
import { cleanupSubscription } from './subscription-storage';

export interface UseInfiniteSubscriptionOptions<
  TSubscriptionFnData = unknown,
  TError = Error,
  TData = TSubscriptionFnData,
  TSubscriptionKey extends QueryKey = QueryKey
> {
  /**
   * This function can be set to automatically get the previous cursor for infinite queries.
   * The result will also be used to determine the value of `hasPreviousPage`.
   */
  getPreviousPageParam?: GetPreviousPageParamFunction<TSubscriptionFnData>;
  /**
   * This function can be set to automatically get the next cursor for infinite queries.
   * The result will also be used to determine the value of `hasNextPage`.
   */
  getNextPageParam?: GetNextPageParamFunction<TSubscriptionFnData>;
  /**
   * Set this to `false` to disable automatic resubscribing when the subscription mounts or changes subscription keys.
   * To refetch the subscription, use the `refetch` method returned from the `useSubscription` instance.
   * Defaults to `true`.
   */
  enabled?: boolean;
  /**
   * If `false`, failed subscriptions will not retry by default.
   * If `true`, failed subscriptions will retry infinitely.
   * If set to an integer number, e.g. 3, failed subscriptions will retry until the failed subscription count meets that number.
   * If set to a function `(failureCount: number, error: TError) => boolean` failed subscriptions will retry until the function returns false.
   */
  retry?: RetryValue<TError>;
  /**
   * If number, applies delay before next attempt in milliseconds.
   * If function, it receives a `retryAttempt` integer and the actual Error and returns the delay to apply before the next attempt in milliseconds.
   * @see https://react-query.tanstack.com/reference/useQuery
   */
  retryDelay?: RetryDelayValue<TError>;
  /**
   * If set to `false`, the subscription will not be retried on mount if it contains an error.
   * Defaults to `true`.
   */
  retryOnMount?: boolean;
  /**
   * This callback will fire if the subscription encounters an error and will be passed the error.
   */
  onError?: (error: TError) => void;
  /**
   * This option can be used to transform or select a part of the data returned by the query function.
   */
  select?: (data: InfiniteData<TSubscriptionFnData>) => InfiniteData<TData>;
  /**
   * If set, this value will be used as the placeholder data for this particular query observer while the subscription is still in the `loading` data and no initialData has been provided.
   */
  placeholderData?:
    | InfiniteData<TSubscriptionFnData>
    | PlaceholderDataFunction<InfiniteData<TSubscriptionFnData>>;
  /**
   * This function will fire any time the subscription successfully fetches new data or the cache is updated via setQueryData.
   */
  onData?: (data: InfiniteData<TData>) => void;
}

export type UseInfiniteSubscriptionResult<
  TData = unknown,
  TError = unknown
> = UseInfiniteQueryResult<TData, TError>;

// eslint-disable-next-line @typescript-eslint/ban-types
function inOperator<K extends string, T extends object>(
  k: K,
  o: T
): o is T & Record<K, unknown> {
  return k in o;
}

function isInfiniteData(value: unknown): value is InfiniteData<unknown> {
  return (
    value &&
    typeof value === 'object' &&
    inOperator('pages', value) &&
    Array.isArray(value.pages) &&
    inOperator('pageParams', value) &&
    Array.isArray(value.pageParams)
  );
}

/**
 * React hook based on React Query for managing, caching and syncing observables
 * in React with infinite pagination.
 *
 * @example
 * ```tsx
 * function ExampleInfiniteSubscription() {
 *   const {
 *     data,
 *     isError,
 *     error,
 *     isFetchingNextPage,
 *     hasNextPage,
 *     fetchNextPage,
 *   } = useInfiniteSubscription(
 *     'test-key',
 *     () => stream$,
 *     {
 *       getNextPageParam: (lastPage, allPages) => lastPage.nextCursor,
 *       // other options
 *     }
 *   );
 *
 *   if (isError) {
 *     return (
 *       <div role="alert">
 *         {error?.message || 'Unknown error'}
 *       </div>
 *     );
 *   }
 *   return <>
 *     {data.pages.map((page) => (
 *       <div key={page.key}>{JSON.stringify(page)}</div>
 *     ))}
 *     {isFetchingNextPage && <>Loading...</>}
 *     {hasNextPage && (
 *       <button onClick={fetchNextPage}>Load more</button>
 *     )}
 *   </>;
 * }
 * ```
 */
export function useInfiniteSubscription<
  TSubscriptionFnData = unknown,
  TError = Error,
  TData = TSubscriptionFnData,
  TSubscriptionKey extends QueryKey = QueryKey
>(
  subscriptionKey: TSubscriptionKey,
  subscriptionFn: (
    context: QueryFunctionContext<TSubscriptionKey>
  ) => Observable<TSubscriptionFnData>,
  options: UseInfiniteSubscriptionOptions<
    TSubscriptionFnData,
    TError,
    TData,
    TSubscriptionKey
  > = {}
): UseInfiniteSubscriptionResult<TData, TError> {
  const hashedSubscriptionKey = hashQueryKey(subscriptionKey);

  const { queryFn, clearErrors } = useObservableQueryFn(
    subscriptionFn,
    (data, previousData, pageParam): InfiniteData<TSubscriptionFnData> => {
      if (!isInfiniteData(previousData)) {
        return {
          pages: [data],
          pageParams: [pageParam],
        };
      }
      const pageIndex = previousData.pageParams.findIndex(
        (cursor) => pageParam === cursor
      );
      return {
        pages: [
          ...(previousData.pages.slice(0, pageIndex) as TSubscriptionFnData[]),
          data,
          ...(previousData.pages.slice(pageIndex + 1) as TSubscriptionFnData[]),
        ],
        pageParams: previousData.pageParams,
      };
    }
  );

  const queryClient = useQueryClient();

  const queryResult = useInfiniteQuery<
    TSubscriptionFnData,
    TError,
    TData,
    TSubscriptionKey
  >(subscriptionKey, queryFn, {
    retry: false,
    ...options,
    staleTime: Infinity,
    refetchInterval: undefined,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    onError: (error: TError) => {
      clearErrors();
      options.onError && options.onError(error);
    },
  });

  useEffect(() => {
    if (queryResult.isSuccess) {
      options.onData?.(queryResult.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryResult.data]);

  useEffect(() => {
    return function cleanup() {
      // Fixes unsubscribe
      // We cannot assume that this fn runs for this component.
      // It might be a different observer associated to the same query key.
      // https://github.com/tannerlinsley/react-query/blob/16b7d290c70639b627d9ada32951d211eac3adc3/src/core/query.ts#L376

      const activeObserversCount = queryClient
        .getQueryCache()
        .find(subscriptionKey)
        ?.getObserversCount();

      if (activeObserversCount === 0) {
        cleanupSubscription(queryClient, hashedSubscriptionKey);
      }
    };
    // This is safe as `hashedSubscriptionKey` is derived from `subscriptionKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, hashedSubscriptionKey]);

  return queryResult;
}
