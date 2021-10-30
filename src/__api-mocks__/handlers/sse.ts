import { rest } from 'msw';

import { createSseResponse } from './utils';

export const handlers = [
  rest.get(`/sse`, (_, res, ctx) => {
    return createSseResponse(res, ctx, [
      'hello',
      'world',
      123,
      'green',
      { test: 'red' },
      'complete',
    ]);
  }),
  rest.get(`/sse/error`, (_, res, ctx) => {
    return createSseResponse(res, ctx, [
      'hello',
      'world',
      123,
      new Error('Test Error'),
    ]);
  }),
  rest.get(`/sse/network-error`, (_, res) => {
    return res.networkError('Failed to connect');
  }),
];
