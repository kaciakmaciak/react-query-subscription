import EventSource from 'eventsource';

Object.defineProperty(global, 'EventSource', {
  value: EventSource,
});
