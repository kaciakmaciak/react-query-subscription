import { useParams } from 'react-router-dom';
import invariant from 'tiny-invariant';

import { Chat } from '../../components/Chat';

function ChatRoute() {
  const { chatId } = useParams();
  invariant(chatId, ':chatId param must be set.');

  return <Chat chatId={chatId} />;
}

export default ChatRoute;
