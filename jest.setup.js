import { setLogger } from 'react-query';
import EventSource from 'eventsource';

setLogger({
  log: console.log,
  warn: console.warn,
  error: () => {},
});

Object.defineProperty(global, 'EventSource', {
  value: EventSource,
});
