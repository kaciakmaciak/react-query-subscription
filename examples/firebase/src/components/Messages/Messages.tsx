import { Fragment, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useInView } from 'react-intersection-observer';

import {
  useMessagesSubscription,
  useUsersSubscription,
  useUserQuery,
} from '../../hooks/api';

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
    <div className="messages" id="chat">
      <span aria-hidden="true" ref={scrollRef} />

      {(isLoadingMessages || isLoadingUsers || isLoadingUser) && (
        <div className="status">Loading...</div>
      )}
      {(isMessagesError || isUsersError || isUserError) && (
        <div className="status">
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
                    className={`message-wrapper ${
                      user.id === message.userId ? 'us' : ''
                    }`}
                  >
                    <img
                      className="pic"
                      src={`https://robohash.org/${
                        messageUser?.fingerprint ?? 'unknown'
                      }.png`}
                      alt=""
                      aria-hidden="true"
                    />
                    <div className="title">
                      {messageUser?.username ?? 'Unknown'}
                    </div>
                    <div className="message">{message.message}</div>
                  </div>
                  <div className="time">{format(message.sentAt, 'PPPp')}</div>
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
  const { ref, inView } = useInView({});

  useEffect(() => {
    if (!inView && !isLoadingMore) return;
    onLoadMore();
  }, [inView, isLoadingMore, onLoadMore]);

  return (
    <div ref={ref} style={{ height: 20 }}>
      {/* @todo debounce loader */}
      {isLoadingMore && 'Loading...'}
    </div>
  );
}
