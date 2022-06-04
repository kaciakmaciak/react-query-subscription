import { Fragment, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useInView } from 'react-intersection-observer';
import { useSpinDelay } from 'spin-delay';
import clsx from 'clsx';

import {
  useMessagesSubscription,
  useUsersSubscription,
  useUserQuery,
} from '../../hooks/api';

import { Avatar } from '../Avatar';

import classes from './Messages.module.css';

export interface MessagesProps {
  chatId: string;
}

export function Messages(props: MessagesProps) {
  const { chatId } = props;
  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isUserError,
  } = useUserQuery();
  const {
    data: messages,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessagesSubscription(chatId);
  const {
    data: users,
    isLoading: isLoadingUsers,
    isError: isUsersError,
  } = useUsersSubscription();

  const scrollRef = useRef<HTMLDivElement>(null);

  const veryLastMessage = messages?.pages[0]?.data[0];
  useEffect(() => {
    if (veryLastMessage?.userId === user?.id) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [veryLastMessage?.id, veryLastMessage?.userId, user]);

  return (
    <div className={classes.Messages} id="chat">
      <span aria-hidden="true" ref={scrollRef} />

      {(isLoadingMessages || isLoadingUsers || isLoadingUser) && (
        <div className={classes.Status}>Loading...</div>
      )}
      {(isMessagesError || isUsersError || isUserError) && (
        <div className={classes.Status}>
          An error occurred while loading messages. Please, try again later.
        </div>
      )}

      {user &&
        users &&
        messages?.pages?.map((page) => (
          <Fragment key={page.nextCursor ?? 'initial'}>
            {page.data.map((message) => {
              const messageUser = users.find(
                (user) => user.id === message.userId
              );
              return (
                <Fragment key={message.id}>
                  <div
                    className={clsx(classes.Message, {
                      [classes.Us]: user.id === message.userId,
                    })}
                  >
                    <Avatar
                      fingerprint={messageUser?.fingerprint ?? 'unknown'}
                      className={classes.Picture}
                    />
                    <div className={classes.MessageTitle}>
                      {messageUser?.username ?? 'Unknown'}
                    </div>
                    <div className={classes.MessageText}>{message.message}</div>
                  </div>
                  <div className={classes.MessageTime}>
                    {format(message.sentAt, 'PPPp')}
                  </div>
                </Fragment>
              );
            })}
          </Fragment>
        ))}
      {hasNextPage && (
        <LoadMore
          isLoadingMore={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />
      )}
    </div>
  );
}

interface LoadMoreProps {
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

function LoadMore(props: LoadMoreProps) {
  const { isLoadingMore, onLoadMore } = props;
  const showLoadingIndicator = useSpinDelay(isLoadingMore, {
    delay: 500,
    minDuration: 500,
  });

  const { ref, inView } = useInView({});

  useEffect(() => {
    if (!inView && !isLoadingMore) return;
    onLoadMore();
  }, [inView, isLoadingMore, onLoadMore]);

  return (
    <div ref={ref} style={{ height: 20 }}>
      {showLoadingIndicator && 'Loading...'}
    </div>
  );
}
