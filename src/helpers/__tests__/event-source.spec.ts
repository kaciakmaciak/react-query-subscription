import { firstValueFrom, of } from 'rxjs';
import { catchError, take, toArray } from 'rxjs/operators';
import type { SpyInstance } from 'vitest';

import { eventSource$ } from '../event-source';

import { server } from '../../__api-mocks__/server';

describe('EventSource helpers', () => {
  let closeSseSpy: SpyInstance;

  beforeEach(() => {
    closeSseSpy = vi.spyOn(global.EventSource.prototype, 'close');
  });

  afterEach(() => {
    closeSseSpy?.mockRestore();
  });

  const requestListener = vi.fn();

  beforeEach(() => {
    server.events.on('request:start', requestListener);
  });

  afterEach(() => {
    server.events.removeListener('request:start', requestListener);
    requestListener.mockClear();
  });

  function createAbsoluteUrl(relativePath: string): string {
    return new URL(relativePath, window.location.href).toString();
  }

  describe('eventSource$', () => {
    it('should emit values from event source', async () => {
      const sse$ = eventSource$(createAbsoluteUrl('/sse'));
      expect(await firstValueFrom(sse$.pipe(take(5), toArray())))
        .toMatchInlineSnapshot(`
          [
            "hello",
            "world",
            123,
            "green",
            {
              "test": "red",
            },
          ]
        `);
    });

    it('should not open the EventSource until subscribed', async () => {
      const sse$ = eventSource$(createAbsoluteUrl('/sse'));
      expect(requestListener).not.toHaveBeenCalled();

      const promise = firstValueFrom(sse$.pipe(take(5), toArray()));
      expect(requestListener).toHaveBeenCalledTimes(1);

      await promise;
    });

    it('should close the EventSource once unsubscribed', async () => {
      const sse$ = eventSource$(createAbsoluteUrl('/sse'));
      await firstValueFrom(sse$.pipe(take(5), toArray()));

      expect(closeSseSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit values from event source until error', async () => {
      const sse$ = eventSource$(createAbsoluteUrl('/sse/error'));
      expect(
        await firstValueFrom(
          sse$.pipe(
            take(5),
            catchError((error) => of(new Error(error.message))),
            toArray()
          )
        )
      ).toMatchInlineSnapshot(`
        [
          "hello",
          "world",
          123,
          [Error: Test Error],
        ]
      `);
    });

    it('should fail to subscribe', async () => {
      expect.assertions(2);
      const sse$ = eventSource$(createAbsoluteUrl('/sse/network-error'));
      try {
        await firstValueFrom(sse$.pipe(take(5), toArray()));
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toMatchInlineSnapshot(`"Event Source Error"`);
      }
    });
  });
});
