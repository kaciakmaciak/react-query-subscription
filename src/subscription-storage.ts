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
  subscription: Subscription,
  pageParam?: string
) {
  const activeSubscriptions: SubscriptionStorage =
    queryClient.getQueryData(clientCacheSubscriptionsKey) || new Map();

  const hashedSubscriptionKey = hashQueryKey(subscriptionKey);
  const previousSubscription = activeSubscriptions.get(hashedSubscriptionKey);

  let newSubscriptionValue: SubscriptionStorageItem;
  if (previousSubscription) {
    previousSubscription.set(pageParam ?? defaultKey, subscription);
    newSubscriptionValue = previousSubscription;
  } else {
    newSubscriptionValue = new Map([[pageParam ?? defaultKey, subscription]]);
  }

  activeSubscriptions.set(hashedSubscriptionKey, newSubscriptionValue);

  queryClient.setQueryData(clientCacheSubscriptionsKey, activeSubscriptions);
}

/**
 * Removes stored subscription by its key and `pageParam` from the clientCache.
 */
export function cleanupSubscription<
  TSubscriptionKey extends QueryKey = QueryKey
>(
  queryClient: QueryClient,
  subscriptionKey: TSubscriptionKey,
  pageParam?: string
) {
  const activeSubscriptions: SubscriptionStorage =
    queryClient.getQueryData(clientCacheSubscriptionsKey) || new Map();

  const hashedSubscriptionKey = hashQueryKey(subscriptionKey);
  const subscription = activeSubscriptions.get(hashedSubscriptionKey);

  if (!subscription) return;

  subscription.forEach((subscription) => {
    subscription.unsubscribe();
  });

  if (pageParam === undefined) {
    subscription.forEach((subscription) => {
      subscription.unsubscribe();
    });
    activeSubscriptions.delete(hashedSubscriptionKey);
  } else {
    subscription.get(pageParam)?.unsubscribe();
    subscription.delete(pageParam);
    activeSubscriptions.set(hashedSubscriptionKey, subscription);
  }

  queryClient.setQueryData(clientCacheSubscriptionsKey, activeSubscriptions);
}
