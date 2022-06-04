import { User } from '../User';
import { Messages } from '../Messages';
import { NewMessage } from '../NewMessage';

export interface ChatProps {
  chatId: string;
}

export function Chat(props: ChatProps) {
  const { chatId } = props;
  return (
    <div className="chat box">
      <User />
      <Messages chatId={chatId} />
      <NewMessage chatId={chatId} />
    </div>
  );
}
