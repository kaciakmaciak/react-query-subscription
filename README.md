# React Query `useSubscription` hook

## Background

I love React Query and since I've been using it I didn't find a use for Redux
anymore. Looking back, I find it _wrong_ to keep the reference data in the global
app state, e.g. Redux store. I'm not saying that the Redux has no use anymore,
but rather that it is designed to solve different problems than fetching data
from APIs.

While React Query is very feature rich, I miss one last bit in it - support for
streams, event emitters, WebSockets etc.

Therefore, I've attempted to create an additional React Query hook.

## Use cases

### Subscribe to WebSocket

```TypeScript

```

### Subscribe to Event source

```TypeScript
const sse = new EventSource('/api/v1/sse');

sse.addEventListener("notice", function(e) {
    console.log(e.data)
  })`
```

### User events ?

## General enough solution

React Query `useQuery`'s query function is any function which returns a Promise.
Therefore, for `useSubscription` it looks natural to use Observables.
