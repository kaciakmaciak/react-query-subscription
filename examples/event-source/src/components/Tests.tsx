import { useState } from 'react';

import { useSubscription } from 'react-query-subscription';
import { eventSource$ } from 'rx-event-source';

interface Props {
  subscriptionKey: string;
  initiallyEnabled?: boolean;
}

function Test({ subscriptionKey, initiallyEnabled }: Props) {
  const [enabled, setEnabled] = useState(Boolean(initiallyEnabled));
  const { data, isError, error, isLoading, isIdle, refetch } = useSubscription(
    [subscriptionKey],
    () => eventSource$('/api/sse'),
    { enabled }
  );

  if (isIdle || !enabled) {
    return <button onClick={() => setEnabled(true)}>Enable</button>;
  }
  if (isLoading) {
    return <>Loading...</>;
  }
  if (isError) {
    return (
      <div role="alert">
        {error?.message || 'Unknown error'}{' '}
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => refetch()}>Refetch</button>
      Test: {JSON.stringify(data)}
    </>
  );
}

export function Tests() {
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [show3, setShow3] = useState(false);
  return (
    <>
      <h1>EventSource Example</h1>
      <p>
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/EventSource">
          EventSource on MDN
        </a>
      </p>
      <p>
        When component is mounted and subscription is enabled, we subscribe to
        EventSource at <code>http://localhost:8080/sse</code> and stream
        messages as JSON data.
      </p>
      <p>Once no components are subscribed, EventSource is closed.</p>
      <p>
        Notice, that first two components have the same subscription keys.
        Therefore they share the EventSource subscription (and only one
        EventSource will be created for both of them).
      </p>
      <p>
        The third component has a unique subscription key, hence is independent
        from other two.
      </p>
      <div>
        <button onClick={() => setShow1((v) => !v)}>
          {show1 ? 'Unmount' : 'Mount'} (Initially disabled)
        </button>{' '}
        {show1 && <Test subscriptionKey="event-source-test-key" />}
      </div>
      <div>
        <button onClick={() => setShow2((v) => !v)}>
          {show2 ? 'Unmount' : 'Mount'} (Initially enabled)
        </button>{' '}
        {show2 && (
          <Test subscriptionKey="event-source-test-key" initiallyEnabled />
        )}
      </div>
      <hr />
      <div>
        <button onClick={() => setShow3((v) => !v)}>
          {show3 ? 'Unmount' : 'Mount'} (Independent)
        </button>{' '}
        {show3 && <Test subscriptionKey="unique" initiallyEnabled />}
      </div>
    </>
  );
}
