import { Link } from 'react-router-dom';

import { Box } from '../Box';
import { User } from '../User';

import classes from './ChatList.module.css';

const chats = ['intro', 'chitchat', 'secret'];

export function ChatList() {
  return (
    <Box>
      <User />
      <div className={classes.Wrapper}>
        <h3>Welcome to Chit-Chat</h3>
        <ul className={classes.ChatList}>
          {chats?.map((chatId) => (
            <li key={chatId}>
              <Link to={`chat/${chatId}`} className={classes.ChatListItem}>
                <span className={classes.ChatName}>{chatId}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Box>
  );
}
