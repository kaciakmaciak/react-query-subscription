import { Link } from 'react-router-dom';

import {
  useMessagesSubscription,
  useUserQuery,
  useUsersSubscription,
} from '../../hooks/api';

import { User } from '../User';

import classes from './ChatList.module.css';

const chats = ['intro', 'chitchat', 'secret'];

export function ChatList() {
  return (
    <div className="box">
      <User />
      <div className={classes.Wrapper}>
        <h3>Welcome to Chit-Chat</h3>
        <ul className={classes.ChatList}>
          {chats?.map((chatId) => (
            <ChatListItem key={chatId} chatId={chatId} />
          ))}
        </ul>
      </div>
    </div>
  );
}

interface ChatListItemProps {
  chatId: string;
}

function ChatListItem(props: ChatListItemProps) {
  const { chatId } = props;
  const { data: userIds } = useMessagesSubscription(chatId, {
    select: (data) => new Set(data.map((message) => message.userId)),
  });
  const { data: users } = useUsersSubscription();
  const { data: currentUser } = useUserQuery();
  return (
    <li key={chatId}>
      <Link to={`chat/${chatId}`} className={classes.ChatListItem}>
        <span className={classes.ChatName}>{chatId}</span>
        <div className={classes.AvatarStack}>
          {[...(userIds ?? new Set())]
            .filter((userId) => userId !== currentUser?.id)
            .slice(0, 5)
            .map((userId) => users?.find((user) => user.id === userId))
            .map((user) =>
              user ? (
                <img
                  key={user.fingerprint}
                  className={`pic ${classes.Avatar}`}
                  src={`https://robohash.org/${user.fingerprint}.png`}
                  alt=""
                  aria-hidden="true"
                />
              ) : null
            )}
        </div>
      </Link>
    </li>
  );
}
