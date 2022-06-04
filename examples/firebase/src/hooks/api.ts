import { useMutation, useQuery } from 'react-query';
import {
  useSubscription,
  useInfiniteSubscription,
} from 'react-query-subscription';
import { faker } from '@faker-js/faker';

import type { UseMutationOptions } from 'react-query';
import type {
  UseSubscriptionOptions,
  UseInfiniteSubscriptionOptions,
} from 'react-query-subscription';

import { getUsers$, findUser, addUser } from '../api/users';
import { addMessage, getMessages$ } from '../api/messages';

import { useFingerprint } from './fingerprint';

import type { User } from '../types/user';
import type { Message } from '../types/message';
import type { InfiniteData } from '../types/infinite-data';

export function useUserQuery() {
  const { data: fingerprint } = useFingerprint();
  return useQuery(
    ['user', fingerprint] as const,
    async ({ queryKey }) => {
      const [, fingerprint] = queryKey;
      if (!fingerprint) return undefined;

      const user = await findUser(fingerprint);
      if (!user) {
        return addUser({
          fingerprint,
          username: `${faker.name.firstName()} ${faker.name.lastName()}`,
          isRandomName: true,
        });
      }
      return user;
    },
    { enabled: Boolean(fingerprint) }
  );
}

export function useUsersSubscription<Data = User[]>(
  options: UseSubscriptionOptions<User[], Error, Data> = {}
) {
  return useSubscription('users', () => getUsers$(), options);
}

export function useMessagesSubscription<Data = InfiniteData<Message[], number>>(
  chatId: string,
  options: UseInfiniteSubscriptionOptions<
    InfiniteData<Message[], number>,
    Error,
    Data
  > = {}
) {
  return useInfiniteSubscription(
    ['messages', chatId],
    ({ pageParam }) =>
      getMessages$(
        chatId,
        pageParam ? { before: pageParam, limit: 5 } : { after: Date.now() }
      ),
    {
      ...options,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );
}

export function useNewMessageMutation(
  chatId: string,
  options: UseMutationOptions<unknown, Error, Omit<Message, 'id'>> = {}
) {
  return useMutation((message) => addMessage(chatId, message), options);
}
