import { useMutation, useQuery } from 'react-query';
import { useSubscription } from 'react-query-subscription';
import { faker } from '@faker-js/faker';

import type { UseMutationOptions, UseQueryOptions } from 'react-query';
import type { UseSubscriptionOptions } from 'react-query-subscription';

import { getUsers$, findUser, addUser } from '../api/users';
import { addMessage, getMessages$ } from '../api/messages';

import { useFingerprint } from './fingerprint';

import type { User } from '../types/user';
import type { Message } from '../types/message';

export function useUserQuery<TData = User>(
  options: UseQueryOptions<User, Error, TData> = {}
) {
  const { data: fingerprint } = useFingerprint();
  return useQuery(
    'user',
    async () => {
      const user = await findUser(fingerprint!);
      if (!user) {
        return addUser({
          fingerprint: fingerprint!,
          username: `${faker.name.firstName()} ${faker.name.lastName()}`,
          isRandomName: true,
        });
      }
      return user;
    },
    {
      ...options,
      enabled: Boolean(fingerprint) && options.enabled !== false,
    }
  );
}

export function useUsersSubscription<Data = User[]>(
  options: UseSubscriptionOptions<User[], Error, Data> = {}
) {
  return useSubscription('users', () => getUsers$(), options);
}

export function useMessagesSubscription<Data = Message[]>(
  chatId: string,
  options: UseSubscriptionOptions<Message[], Error, Data> = {}
) {
  return useSubscription(
    ['messages', chatId],
    () => getMessages$(chatId),
    options
  );
}

export function useNewMessageMutation(
  chatId: string,
  options: UseMutationOptions<unknown, Error, Omit<Message, 'id'>> = {}
) {
  return useMutation((message) => addMessage(chatId, message), options);
}
