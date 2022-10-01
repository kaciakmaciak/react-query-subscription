import EventSource from 'eventsource';

import { server } from '../src/__api-mocks__/server';

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
