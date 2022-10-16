### [1.8.1](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.8.0...v1.8.1) (2022-10-16)


### 🐛 Bug Fixes

* fix calling subscription fn multiple times when `subscriptionKey` is not a string ([a7f32f3](https://github.com/kaciakmaciak/react-query-subscription/commit/a7f32f3d1c958dc40c74dec8c8e99ced464e2f80))

## [1.8.0](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.7.0...v1.8.0) (2022-10-08)


### ✨ Features

* **peer-deps:** support React v18 ([3b3dd5c](https://github.com/kaciakmaciak/react-query-subscription/commit/3b3dd5c32bf1325e238bdea71f1c3f642476b13f))

## [1.7.0](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.6.0...v1.7.0) (2022-10-07)


### ✨ Features

* **helpers:** deprecate `fromEventSource` and `eventSource$` helpers ([01cf6b9](https://github.com/kaciakmaciak/react-query-subscription/commit/01cf6b9a23bba80811a0d6e20b9bfe40664f0431))

## [1.6.0](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.5.1...v1.6.0) (2022-09-30)


### ✨ Features

* **useInfiniteSubscription:** add `useInfiniteSubscription` hook ([64a3f94](https://github.com/kaciakmaciak/react-query-subscription/commit/64a3f94b41dda867579abadf8c6aa7fc8d9b34c6)), closes [#55](https://github.com/kaciakmaciak/react-query-subscription/issues/55)
* **useSubscription:** pass `queryKey` to  `subscriptionFn` ([7564823](https://github.com/kaciakmaciak/react-query-subscription/commit/75648232ed75b0a74adf71fe9aa2f7445cf60f3a))


### 🐛 Bug Fixes

* **useInfiniteSubscription:** fix unsubscribing when previous/next page has been fetched ([a05675b](https://github.com/kaciakmaciak/react-query-subscription/commit/a05675be0fb29b83acef3a803977900504a09c47))

## [1.6.0-beta.2](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.6.0-beta.1...v1.6.0-beta.2) (2022-07-02)


### 🐛 Bug Fixes

* **useInfiniteSubscription:** fix unsubscribing when previous/next page has been fetched ([fef6b3f](https://github.com/kaciakmaciak/react-query-subscription/commit/fef6b3fd8cb54615fd6b7eb153266b5696f0318b))

## [1.6.0-beta.1](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.5.1...v1.6.0-beta.1) (2022-07-02)


### ✨ Features

* **useInfiniteSubscription:** add `useInfiniteSubscription` hook ([d1d1da1](https://github.com/kaciakmaciak/react-query-subscription/commit/d1d1da1635559455f850ab136a34edafecba91fd)), closes [#55](https://github.com/kaciakmaciak/react-query-subscription/issues/55)
* **useSubscription:** pass `queryKey` to  `subscriptionFn` ([aff5e3e](https://github.com/kaciakmaciak/react-query-subscription/commit/aff5e3eefb9865ea6c16bd879d41853bf3db8c7a))

### [1.5.1](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.5.0...v1.5.1) (2022-06-24)


### 🐛 Bug Fixes

* **npm:** fix UMD build ([78d4fb8](https://github.com/kaciakmaciak/react-query-subscription/commit/78d4fb8cec48f9cc8b92925a8221e73d12de2909)), closes [#51](https://github.com/kaciakmaciak/react-query-subscription/issues/51)

## [1.5.0](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.4.0...v1.5.0) (2022-05-30)


### ✨ Features

* **useSubscription:** add `onData` option ([#34](https://github.com/kaciakmaciak/react-query-subscription/issues/34)) ([36a6859](https://github.com/kaciakmaciak/react-query-subscription/commit/36a68591a056be3afa2c396cc7aee9d9c2ac0ac3))

## [1.4.0](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.3.0...v1.4.0) (2021-11-07)

### ✨ Features

- **useSubscription:** add `onError` option ([c102b7c](https://github.com/kaciakmaciak/react-query-subscription/commit/c102b7c771d3d2a894767fab28b531e9d3cf4ab5)), closes [#29](https://github.com/kaciakmaciak/react-query-subscription/issues/29)

## [1.3.0](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.2.0...v1.3.0) (2021-11-02)

### ✨ Features

- **useSubscription:** add `retryDelay` option ([2648116](https://github.com/kaciakmaciak/react-query-subscription/commit/26481160b41aebab807798663834df5b16596954)), closes [#24](https://github.com/kaciakmaciak/react-query-subscription/issues/24)

## [1.2.0](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.1.0...v1.2.0) (2021-10-31)

### ✨ Features

- **types:** export `UseSubscriptionOptions` and `EventSourceOptions` types ([3c497d8](https://github.com/kaciakmaciak/react-query-subscription/commit/3c497d8285784f0befa286b00edc1bbe46bc34b6))

## [1.1.0](https://github.com/kaciakmaciak/react-query-subscription/compare/v1.0.0...v1.1.0) (2021-10-30)

### ✨ Features

- **helpers:** add `fromEventSource` and `eventSource$` helpers ([38370dc](https://github.com/kaciakmaciak/react-query-subscription/commit/38370dc1b11435c86167db3ae2a1f4f0ea17d023)), closes [#13](https://github.com/kaciakmaciak/react-query-subscription/issues/13)
