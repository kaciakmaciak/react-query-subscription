import { useRef } from 'react';
import { hashQueryKey, useQueryClient } from '@tanstack/react-query';
import type {
  QueryFunction,
  QueryKey,
  QueryFunctionContext,
} from '@tanstack/react-query';
import { Observable, of, firstValueFrom } from 'rxjs';
import { catchError, finalize, share, tap, skip } from 'rxjs/operators';

import { storeSubscription, cleanupSubscription } from './subscription-storage';

export interface UseObservableQueryFnResult<
  TSubscriptionFnData = unknown,
  TSubscriptionKey extends QueryKey = QueryKey
> {
  queryFn: QueryFunction<TSubscriptionFnData, TSubscriptionKey>;
  clearErrors: () => void;
}

export function useObservableQueryFn<
  TSubscriptionFnData = unknown,
  TCacheData = TSubscriptionFnData,
  TSubscriptionKey extends QueryKey = QueryKey
>(
  subscriptionFn: (
    context: QueryFunctionContext<TSubscriptionKey>
  ) => Observable<TSubscriptionFnData>,
  dataUpdater: (
    data: TSubscriptionFnData,
    previousData: unknown,
    pageParam: unknown | undefined
  ) => TCacheData
): UseObservableQueryFnResult<TSubscriptionFnData, TSubscriptionKey> {
  const queryClient = useQueryClient();

  // We cannot assume that this fn runs for this component.
  // It might be a different observer associated to the same query key.
  // https://github.com/tannerlinsley/react-query/blob/16b7d290c70639b627d9ada32951d211eac3adc3/src/core/query.ts#L376
  // @todo: move from the component scope to queryCache
  const failRefetchWith = useRef<false | Error>(false);

  const queryFn: QueryFunction<TSubscriptionFnData, TSubscriptionKey> = (
    context
  ) => {
    const { queryKey: subscriptionKey, pageParam, signal } = context;
    const hashedSubscriptionKey = hashQueryKey(subscriptionKey);

    if (failRefetchWith.current) {
      throw failRefetchWith.current;
    }

    type Result = Promise<TSubscriptionFnData> & { cancel?: () => void };

    const stream$ = subscriptionFn(context).pipe(share());
    const result: Result = firstValueFrom(stream$);

    // Fixes scenario when component unmounts before first emit.
    // If we do not invalidate the query, the hook will never re-subscribe,
    // as data are otherwise marked as fresh.
    function cancel() {
      queryClient.invalidateQueries(subscriptionKey, undefined, {
        cancelRefetch: false,
      });
    }
    // `signal` is available on context from ReactQuery 3.30.0
    // If `AbortController` is not available in the current runtime environment
    // ReactQuery sets `signal` to `undefined`. In that case we fallback to
    // old API, attaching `cancel` fn on promise.
    // @see https://tanstack.com/query/v4/docs/guides/query-cancellation
    if (signal) {
      signal.addEventListener('abort', cancel);
    } else {
      /* istanbul ignore next */
      result.cancel = cancel;
    }

    // @todo: Skip subscription for SSR
    cleanupSubscription(
      queryClient,
      hashedSubscriptionKey,
      pageParam ?? undefined
    );

    const subscription = stream$
      .pipe(
        skip(1),
        tap((data) => {
          queryClient.setQueryData(subscriptionKey, (previousData) =>
            dataUpdater(data, previousData, pageParam)
          );
        }),
        catchError((error) => {
          failRefetchWith.current = error;
          queryClient.setQueryData(subscriptionKey, (data) => data, {
            // To make the retryOnMount work
            // @see: https://github.com/tannerlinsley/react-query/blob/9e414e8b4f3118b571cf83121881804c0b58a814/src/core/queryObserver.ts#L727
            updatedAt: 0,
          });
          return of(undefined);
        }),
        finalize(() => {
          queryClient.invalidateQueries(subscriptionKey, undefined, {
            cancelRefetch: false,
          });
        })
      )
      .subscribe();

    // remember the current subscription
    // see `cleanup` fn for more info
    storeSubscription(
      queryClient,
      hashedSubscriptionKey,
      subscription,
      pageParam ?? undefined
    );

    return result;
  };

  return {
    queryFn,
    // @todo incorporate into `queryFn`?
    clearErrors: () => {
      // Once the error has been thrown, and a query result created (with error)
      // cleanup the `failRefetchWith`.
      failRefetchWith.current = false;
    },
  };
}
