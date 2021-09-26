import { QueryKey, hashQueryKey, QueryClient } from 'react-query';
import { Subscription } from 'rxjs';

const clientCacheSubscriptionsKey = '__activeSubscriptions__';

/**
 * Stores subscription by its key in the clientCache.
 */
export function storeSubscription<TSubscriptionKey extends QueryKey = QueryKey>(
  queryClient: QueryClient,
  subscriptionKey: TSubscriptionKey,
  subscription: Subscription
) {
  const activeSubscriptions =
    queryClient.getQueryData<Map<string, Subscription>>(
      clientCacheSubscriptionsKey
    ) || new Map();

  const hashedSubscriptionKey = hashQueryKey(subscriptionKey);
  activeSubscriptions.set(hashedSubscriptionKey, subscription);

  queryClient.setQueryData(clientCacheSubscriptionsKey, activeSubscriptions);
}

/**
 * Removes stored subscription by its key from the clientCache.
 */
export function cleanupSubscription<
  TSubscriptionKey extends QueryKey = QueryKey
>(queryClient: QueryClient, subscriptionKey: TSubscriptionKey) {
  const activeSubscriptions =
    queryClient.getQueryData<Map<string, Subscription>>(
      clientCacheSubscriptionsKey
    ) || new Map();

  const hashedSubscriptionKey = hashQueryKey(subscriptionKey);
  activeSubscriptions.get(hashedSubscriptionKey)?.unsubscribe();
  activeSubscriptions.delete(hashedSubscriptionKey);

  queryClient.setQueryData(clientCacheSubscriptionsKey, activeSubscriptions);
}
