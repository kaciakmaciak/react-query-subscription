import React, { useState } from 'react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { createClient } from 'graphql-ws';

import styles from './styles.module.css';

import {
  useSubscription,
  graphqlSubscription$,
} from 'react-query-subscription';

interface Props {
  subscriptionKey: string;
  initiallyEnabled?: boolean;
}

interface Point {
  id: string;
  x: number;
  y: number;
  diameter: number;
  color: string;
}

const client = createClient({ url: 'ws://localhost:8080/graphql' });

function Test({ subscriptionKey, initiallyEnabled }: Props) {
  const [enabled, setEnabled] = useState(Boolean(initiallyEnabled));
  const { data, isError, error, isLoading, isIdle, refetch } = useSubscription(
    subscriptionKey,
    // @todo: URL to deployed instance or local dev server
    // () =>
    //   graphqlSubscription$<{ points: Array<Point> }>(
    //     'ws://localhost:8080/graphql',
    //     {
    //       query: `
    //       subscription PointSubscription(
    //         $width: Float!
    //         $height: Float!
    //         $id: Float
    //       ) {
    //         points(width: $width, height: $height, id: $id) {
    //           id
    //           x
    //           y
    //           diameter
    //           color
    //         }
    //       }
    //     `,
    //       variables: {
    //         width: 800,
    //         height: 600,
    //         id: 123,
    //       },
    //     }
    //   ),
    () =>
      graphqlSubscription$<{ points: Array<Point> }>(client, {
        query: `
          subscription PointSubscription(
            $width: Float!
            $height: Float!
            $id: Float
          ) {
            points(width: $width, height: $height, id: $id) {
              id
              x
              y
              diameter
              color
            }
          }
        `,
        variables: {
          width: 800,
          height: 600,
          id: 123,
        },
      }),
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
      {data?.points && (
        <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          {data.points.map((point) => (
            <circle
              key={point.id}
              className={styles.transparent}
              cx={point.x}
              cy={point.y}
              r={point.diameter / 2}
              fill={point.color}
            />
          ))}
          {data.points.length > 0 && (
            <circle
              className={styles.animate}
              cx={data.points[data.points.length - 1].x}
              cy={data.points[data.points.length - 1].y}
              r={data.points[data.points.length - 1].diameter / 2}
              fill={data.points[data.points.length - 1].color}
            />
          )}
        </svg>
      )}
    </>
  );
}

const queryClient = new QueryClient();

function App() {
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [show3, setShow3] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      <h1>GraphQL Example</h1>
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
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
