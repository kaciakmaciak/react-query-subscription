import { useEffect, useRef } from 'react';
import {
  QueryFunction,
  QueryKey,
  useQuery,
  useQueryClient,
  UseQueryOptions,
  UseQueryResult,
} from 'react-query';
import { Observable, of, firstValueFrom } from 'rxjs';
import { catchError, finalize, share, tap, skip } from 'rxjs/operators';

import { storeSubscription, cleanupSubscription } from './subscription-storage';

export type UseSubscriptionOptions<
  TSubscriptionFnData = unknown,
  TError = Error,
  TData = TSubscriptionFnData,
  TSubscriptionKey extends QueryKey = QueryKey
> = Pick<
  UseQueryOptions<TSubscriptionFnData, TError, TData, TSubscriptionKey>,
  | 'enabled'
  | 'retry'
  | 'retryOnMount'
  | 'select'
  | 'placeholderData'
>;

export type UseSubscriptionResult<TData = unknown, TError = unknown> = UseQueryResult<TData, TError>;

/**
 * @todo: [ ] make sure all options are covered (or excluded)
 * @todo: [ ] make sure all callbacks are called appropriately
 * @todo: [ ] hot observable
 * @todo: [ ] cold observable ?
 * @todo: [ ] react suspense
 * @todo: [ ] SSR
 */
export function useSubscription<
  TSubscriptionFnData = unknown,
  TError = Error,
  TData = TSubscriptionFnData,
  TSubscriptionKey extends QueryKey = QueryKey
>(
  subscriptionKey: TSubscriptionKey,
  subscriptionFn: () => Observable<TSubscriptionFnData>,
  options: UseSubscriptionOptions<
    TSubscriptionFnData,
    TError,
    TData,
    TSubscriptionKey
  > = {}
): UseSubscriptionResult<TData, TError> {
  const queryClient = useQueryClient();

  // We cannot assume that this fn runs for this component.
  // It might be a different observer associated to the same query key.
  // https://github.com/tannerlinsley/react-query/blob/16b7d290c70639b627d9ada32951d211eac3adc3/src/core/query.ts#L376
  // @todo: move from the component scope to queryCache
  const failRefetchWith = useRef<false | Error>(false);

  const queryFn: QueryFunction<TSubscriptionFnData, TSubscriptionKey> = ({
    queryKey,
  }) => {
    if (failRefetchWith.current) {
      throw failRefetchWith.current;
    }

    const stream$ = subscriptionFn().pipe(share());
    const result = firstValueFrom(stream$);

    // Fixes scenario when component unmounts before first emit.
    // If we do not invalidate the query, the hook will never re-subscribe,
    // as data are otherwise marked as fresh.
    // @todo: any
    (result as any).cancel = () => {
      queryClient.invalidateQueries(queryKey);
    };

    // @todo: Skip subscription for SSR
    cleanupSubscription(queryClient, queryKey);

    const subscription = stream$
      .pipe(
        skip(1),
        tap((data) => {
          queryClient.setQueryData(queryKey, data);
        }),
        catchError((error) => {
          failRefetchWith.current = error;
          queryClient.setQueryData(queryKey, (data) => data, {
            // To make the retryOnMount work
            // @see: https://github.com/tannerlinsley/react-query/blob/9e414e8b4f3118b571cf83121881804c0b58a814/src/core/queryObserver.ts#L727
            updatedAt: 0,
          });
          return of(undefined);
        }),
        finalize(() => {
          queryClient.invalidateQueries(queryKey);
        })
      )
      .subscribe();

    // remember the current subscription
    // see `cleanup` fn for more info
    storeSubscription(queryClient, subscriptionKey, subscription);

    return result;
  };

  const queryResult = useQuery<
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
    onError: () => {
      // Once the error has been thrown, and a query result created (with error)
      // cleanup the `failRefetchWith`.
      failRefetchWith.current = undefined;
    },
  });

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
        cleanupSubscription(queryClient, subscriptionKey);
      }
    };
  }, [queryClient, subscriptionKey]);

  return queryResult;
}
