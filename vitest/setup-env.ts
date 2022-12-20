import { setLogger } from 'react-query';
import EventSource from 'eventsource';

import { server } from '../src/__api-mocks__/server';

setLogger({
  log: console.log,
  warn: console.warn,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  error: () => {},
});

/**
 * MSW
 * @see https://mswjs.io/docs/getting-started/install
 */
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Mock EventSource
 */
Object.defineProperty(global, 'EventSource', {
  value: EventSource,
});
