import { fromEvent, merge, Observable, of } from 'rxjs';
import { map, finalize, takeUntil, switchMap } from 'rxjs/operators';

export interface EventSourceOptions<TData = unknown> {
  /**
   * Event types to subscribe to.
   * @default ['message']
   */
  eventTypes: Array<string>;
  /**
   * Function to parse messages.
   * @default (_, message) => JSON.parse(message)
   */
  parseFn: (eventType: string, message: string) => TData;
}

/**
 * Takes EventSource and creates an observable from it.
 *
 * @example
 * ```ts
 * const sse = new EventSource(url, configuration);
 * return fromEventSource(sse).pipe(
 *   finalize(() => {
 *     // Make sure the EventSource is closed once not needed.
 *     sse.close();
 *   }),
 * );
 * ```
 */
export function fromEventSource<TData = unknown>(
  sse: EventSource,
  options?: EventSourceOptions<TData>
): Observable<TData> {
  const defaultOptions: EventSourceOptions<TData> = {
    eventTypes: ['message'],
    parseFn: (_, message) => JSON.parse(message),
  };
  const { eventTypes, parseFn } = { ...defaultOptions, ...(options || {}) };
  const events$ = eventTypes.map((eventType) =>
    fromEvent<{ data: string }>(sse, eventType).pipe(
      map((event: MessageEvent<string>) => parseFn(eventType, event.data))
    )
  );

  const error$ = fromEvent<{ data?: string }>(sse, 'error').pipe(
    map((message) => JSON.parse(message?.data || 'null')),
    map((data) => {
      throw new Error(data?.errorMessage || 'Event Source Error');
    })
  );

  const complete$ = fromEvent(sse, 'complete');
  return merge(...events$, error$).pipe(takeUntil(complete$));
}

/**
 * Creates event source from url (and config) and returns an observable with
 * parsed event source data.
 * Opens the event source once subscribed.
 * Closes the event source, once unsubscribed.
 *
 * @example
 * ```ts
 * const sse$ = eventSource$('https://example.com/sse', {
 *   withCredentials: true,
 * });
 * sse$.subscribe((data) => {
 *   console.log(data);
 * });
 * ```
 */
export function eventSource$<TData = unknown>(
  url: string,
  configuration?: EventSourceInit,
  options?: EventSourceOptions<TData>
): Observable<TData> {
  return of({ url, configuration }).pipe(
    switchMap(({ url, configuration }) => {
      const sse = new EventSource(url, configuration);
      return fromEventSource<TData>(sse, options).pipe(
        finalize(() => {
          sse.close();
        })
      );
    })
  );
}
