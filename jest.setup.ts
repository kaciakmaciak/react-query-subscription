import { setLogger } from 'react-query';
import EventSource from 'eventsource';

setLogger({
  log: console.log,
  warn: console.warn,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  error: () => {},
});

Object.defineProperty(global, 'EventSource', {
  value: EventSource,
});
