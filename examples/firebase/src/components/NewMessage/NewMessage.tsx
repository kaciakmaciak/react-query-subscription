import { useRef } from 'react';

import { useNewMessageMutation, useUserQuery } from '../../hooks/api';

export interface NewMessageProps {
  chatId: string;
}

export function NewMessage(props: NewMessageProps) {
  const { chatId } = props;

  const { data: user } = useUserQuery();
  const { mutate: addMessage } = useNewMessageMutation(chatId);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const inputValue = inputRef.current?.value;
    if (!user?.id || !inputValue) return;

    addMessage({
      userId: user.id,
      message: inputValue,
      sentAt: new Date(),
    });

    inputRef.current.value = '';
  };
  return (
    <form className="input" onSubmit={handleSubmit}>
      <i className="fas fa-camera"></i>
      <i className="far fa-laugh-beam"></i>
      <input
        ref={inputRef}
        placeholder="Type your message here!"
        type="text"
        name="message"
        disabled={!user}
        autoComplete="off"
      />
      <i className="fas fa-microphone"></i>
    </form>
  );
}
