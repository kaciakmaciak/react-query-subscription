import { setupServer } from 'msw/node';
export { rest } from 'msw';

import { handlers } from './handlers';

export const server = setupServer(...handlers);
