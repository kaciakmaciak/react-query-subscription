import { useParams } from 'react-router-dom';

import { Chat } from '../../components/Chat';

function ChatRoute() {
  const { chatId } = useParams();
  return <div className="center">{chatId && <Chat chatId={chatId} />}</div>;
}

export default ChatRoute;
