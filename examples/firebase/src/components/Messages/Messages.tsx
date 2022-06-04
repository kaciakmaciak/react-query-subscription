import { Fragment, useEffect, useRef } from 'react';
import { format } from 'date-fns';

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
  } = useMessagesSubscription(chatId);
  const {
    data: users,
    isLoading: isLoadingUsers,
    isError: isUsersError,
  } = useUsersSubscription();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, user]);

  return (
    <div className="messages" id="chat">
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
        messages?.map((message) => {
          const messageUser = users.find((user) => user.id === message.userId);
          return (
            <Fragment key={message.id}>
              <div className="time">{format(message.sentAt, 'PPPp')}</div>
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
            </Fragment>
          );
        })}
      <span aria-hidden="true" ref={scrollRef} />
    </div>
  );
}
