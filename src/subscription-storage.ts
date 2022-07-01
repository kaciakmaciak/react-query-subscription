import { QueryKey, hashQueryKey, QueryClient } from 'react-query';
import { Subscription } from 'rxjs';

const clientCacheSubscriptionsKey = '__activeSubscriptions__';
const defaultKey = Symbol('__default__');

type SubscriptionStorageItem = Map<string | typeof defaultKey, Subscription>;
type SubscriptionStorage = Map<string, SubscriptionStorageItem>;

/**
 * Stores subscription by its key and `pageParam` in the clientCache.
 */
export function storeSubscription<TSubscriptionKey extends QueryKey = QueryKey>(
  queryClient: QueryClient,
  subscriptionKey: TSubscriptionKey,
  subscription: Subscription
) {
  const activeSubscriptions: SubscriptionStorage =
    queryClient.getQueryData(clientCacheSubscriptionsKey) || new Map();

  const hashedSubscriptionKey = hashQueryKey(subscriptionKey);
  const previousSubscription = activeSubscriptions.get(hashedSubscriptionKey);

  let newSubscriptionValue: SubscriptionStorageItem;
  if (previousSubscription) {
    previousSubscription.set(defaultKey, subscription);
    newSubscriptionValue = previousSubscription;
  } else {
    newSubscriptionValue = new Map([[defaultKey, subscription]]);
  }

  activeSubscriptions.set(hashedSubscriptionKey, newSubscriptionValue);

  queryClient.setQueryData(clientCacheSubscriptionsKey, activeSubscriptions);
}

/**
 * Removes stored subscription by its key and `pageParam` from the clientCache.
 */
export function cleanupSubscription<
  TSubscriptionKey extends QueryKey = QueryKey
>(queryClient: QueryClient, subscriptionKey: TSubscriptionKey) {
  const activeSubscriptions: SubscriptionStorage =
    queryClient.getQueryData(clientCacheSubscriptionsKey) || new Map();

  const hashedSubscriptionKey = hashQueryKey(subscriptionKey);
  const subscription = activeSubscriptions.get(hashedSubscriptionKey);

  if (!subscription) return;

  subscription.forEach((subscription) => {
    subscription.unsubscribe();
  });

  subscription.forEach((subscription) => {
    subscription.unsubscribe();
  });
  activeSubscriptions.delete(hashedSubscriptionKey);

  queryClient.setQueryData(clientCacheSubscriptionsKey, activeSubscriptions);
}
