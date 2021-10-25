# React Query `useSubscription` hook

## Background

While React Query is very feature rich, it misses one thing - support for streams, event emitters, WebSockets etc. This library leverages React Query's `useQuery` to provide `useSubscription` hook for subscribing to real-time data.

## General enough solution

React Query `useQuery`'s query function is _any_ function which returns a Promise. Similarly, `useSubscription`'s subscription function is _any_ function which returns an _Observable_.

## Installation

### NPM

```sh
npm install react-query-subscription react react-query@3 rxjs@7
```

or

```sh
yarn add react-query-subscription react react-query@3 rxjs@7
```

## Use cases

### Subscribe to WebSocket

TODO

### Subscribe to Event source

```TypeScript
import { QueryClientProvider, QueryClient } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { useSubscription } from 'react-query-subscription';
import { fromEvent, merge, of } from 'rxjs';
import { map, finalize, takeUntil, switchMap } from 'rxjs/operators';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SseExample />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

function fromEventSource(url: string) {
  const sse = new EventSource(url);

  const message$ = fromEvent<{ data: string }>(sse, 'message').pipe(
    map((event: MessageEvent<string>) => JSON.parse(event.data))
  );
  const error$ = fromEvent<{ data?: string }>(sse, 'error').pipe(
    map((message) => JSON.parse(message?.data || 'null')),
    map((data) => {
      throw new Error(data?.errorMessage || 'Event Source Error');
    })
  );
  const complete$ = fromEvent(sse, 'complete');

  return merge(message$, error$).pipe(takeUntil(complete$));
}

function SseExample() {
  const { data, isLoading, isError, error } = useSubscription(
    'some-key',
    () => fromEventSource('/api/v1/sse'),
    {
      // options
    }
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (isError) {
    return (
      <div role="alert">
        {error?.message || 'Unknown error'}
      </div>
    );
  }
  return <div>Data: {JSON.stringify(data)}</div>;
}
```

<!-- ### User events

TODO -->
