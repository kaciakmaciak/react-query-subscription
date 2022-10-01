import { QueryClient } from '@tanstack/react-query';
import { Subscription } from 'rxjs';

const clientCacheSubscriptionsKey = ['__activeSubscriptions__'];
const defaultKey = Symbol('__default__');

type SubscriptionStorageItem = Map<string | typeof defaultKey, Subscription>;
type SubscriptionStorage = Map<string, SubscriptionStorageItem>;

/**
 * Stores subscription by its key and `pageParam` in the clientCache.
 */
export function storeSubscription(
  queryClient: QueryClient,
  hashedSubscriptionKey: string,
  subscription: Subscription,
  pageParam?: string
) {
  const activeSubscriptions: SubscriptionStorage =
    queryClient.getQueryData(clientCacheSubscriptionsKey) || new Map();

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
export function cleanupSubscription(
  queryClient: QueryClient,
  hashedSubscriptionKey: string,
  pageParam?: string
) {
  const activeSubscriptions: SubscriptionStorage =
    queryClient.getQueryData(clientCacheSubscriptionsKey) || new Map();

  const subscription = activeSubscriptions.get(hashedSubscriptionKey);

  if (!subscription) return;

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
