# React Query `useSubscription` hook

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[all-contributors-badge]: https://img.shields.io/badge/all_contributors-1-orange.svg?style=round-square 'Number of contributors on All-Contributors'

<!-- ALL-CONTRIBUTORS-BADGE:END -->

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/kaciakmaciak/react-query-subscription?display_name=tag&sort=semver)](https://github.com/kaciakmaciak/react-query-subscription/releases)
[![All Contributors][all-contributors-badge]](#contributors-)
[![codecov](https://codecov.io/gh/kaciakmaciak/react-query-subscription/branch/master/graph/badge.svg)](https://codecov.io/gh/kaciakmaciak/react-query-subscription)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/kaciakmaciak/react-query-subscription/CI)
![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/kaciakmaciak/react-query-subscription)
![Semantic release](https://img.shields.io/badge/%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079)
[![npm bundle size](https://img.shields.io/bundlephobia/min/react-query-subscription)](https://www.npmjs.com/package/react-query-subscription)
[![GitHub](https://img.shields.io/github/license/kaciakmaciak/react-query-subscription)](LICENSE)

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
import { useSubscription, eventSource$ } from 'react-query-subscription';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SseExample />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

function SseExample() {
  const { data, isLoading, isError, error } = useSubscription(
    'some-key',
    () => eventSource$('/api/v1/sse'),
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

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/kaciakmaciak"><img src="https://avatars.githubusercontent.com/u/17466633?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Katarina Anton</b></sub></a><br /><a href="https://github.com/kaciakmaciak/react-query-subscription/commits?author=kaciakmaciak" title="Code">💻</a> <a href="#ideas-kaciakmaciak" title="Ideas, Planning, & Feedback">🤔</a> <a href="#maintenance-kaciakmaciak" title="Maintenance">🚧</a> <a href="https://github.com/kaciakmaciak/react-query-subscription/commits?author=kaciakmaciak" title="Tests">⚠️</a> <a href="#tool-kaciakmaciak" title="Tools">🔧</a> <a href="#infra-kaciakmaciak" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
