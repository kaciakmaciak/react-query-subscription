import { firstValueFrom, of } from 'rxjs';
import { catchError, take, toArray } from 'rxjs/operators';

import { eventSource$ } from '../event-source';

import { server } from '../../__api-mocks__/server';

describe('EventSource helpers', () => {
  let closeSseSpy: jest.SpyInstance;

  beforeEach(() => {
    closeSseSpy = jest.spyOn(global.EventSource.prototype, 'close');
  });

  afterEach(() => {
    closeSseSpy?.mockRestore();
  });

  const requestListener = jest.fn();

  beforeEach(() => {
    server.events.on('request:start', requestListener);
  });

  afterEach(() => {
    server.events.removeListener('request:start', requestListener);
    requestListener.mockClear();
  });

  describe('eventSource$', () => {
    it('should emit values from event source', async () => {
      const sse$ = eventSource$('/sse');
      expect(await firstValueFrom(sse$.pipe(take(5), toArray())))
        .toMatchInlineSnapshot(`
        Array [
          "hello",
          "world",
          123,
          "green",
          Object {
            "test": "red",
          },
        ]
      `);
    });

    it('should not open the EventSource until subscribed', async () => {
      const sse$ = eventSource$('/sse');
      expect(requestListener).not.toHaveBeenCalled();

      const promise = firstValueFrom(sse$.pipe(take(5), toArray()));
      expect(requestListener).toHaveBeenCalledTimes(1);

      await promise;
    });

    it('should close the EventSource once unsubscribed', async () => {
      const sse$ = eventSource$('/sse');
      await firstValueFrom(sse$.pipe(take(5), toArray()));

      expect(closeSseSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit values from event source until error', async () => {
      const sse$ = eventSource$('/sse/error');
      expect(
        await firstValueFrom(
          sse$.pipe(
            take(5),
            catchError((error) => of(new Error(error.message))),
            toArray()
          )
        )
      ).toMatchInlineSnapshot(`
        Array [
          "hello",
          "world",
          123,
          [Error: Test Error],
        ]
      `);
    });

    it('should fail to subscribe', async () => {
      expect.assertions(2);
      const sse$ = eventSource$('/sse/network-error');
      try {
        await firstValueFrom(sse$.pipe(take(5), toArray()));
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toMatchInlineSnapshot(`"Event Source Error"`);
      }
    });
  });
});