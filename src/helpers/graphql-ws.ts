import { createClient, Client, SubscribePayload } from 'graphql-ws';
import { Observable, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

/**
 * @see https://github.com/enisdenjo/graphql-ws#observable
 * @todo
 * test with rxjs from?
 */
export function fromWsClientSubscription<TData = Record<string, unknown>>(
  client: Client,
  payload: SubscribePayload
) {
  let unsubscribe: () => void;
  return new Observable<TData | null>((observer) => {
    unsubscribe = client.subscribe<TData>(payload, {
      next: (data) => observer.next(data.data),
      error: (err) => observer.error(err),
      complete: () => observer.complete(),
    });
  }).pipe(
    finalize(() => {
      unsubscribe();
    })
  );
}

export function graphqlSubscription$<TData = Record<string, unknown>>(
  urlOrClient: string | Client,
  payload: SubscribePayload
) {
  return of({ urlOrClient, payload }).pipe(
    switchMap(({ urlOrClient, payload }) => {
      const client =
        typeof urlOrClient === 'string'
          ? createClient({ url: urlOrClient })
          : urlOrClient;
      return fromWsClientSubscription<TData>(client, payload).pipe(
        finalize(() => {
          if (typeof urlOrClient === 'string') {
            client.dispose();
          }
        })
      );
    })
  );
}
