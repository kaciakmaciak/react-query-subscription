import type { ResponseComposition, RestContext } from 'msw';

/**
 * Returns SSE message.
 */
function createSseMessage(eventType: string, data: unknown) {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Returns SSE error message.
 */
function createSseErrorMessage(errorMessage: string) {
  return createSseMessage('error', {
    errorMessage,
  });
}

/**
 * Returns SSE complete message.
 */
function createSseCompleteMessage() {
  return createSseMessage('complete', null);
}

/**
 * Returns SSE response with specified values.
 * If any of the values is instance of error, emit error message.
 * Stop on "complete" message.
 */
export function createSseResponse(
  res: ResponseComposition,
  ctx: RestContext,
  values: Array<unknown | 'complete' | Error>
) {
  return res(
    ctx.status(200),
    ctx.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
    }),
    ctx.delay(10),
    // We cannot stream body, so sending all messages at once.
    ctx.body(
      values
        .map((value) => {
          if (value instanceof Error) {
            return createSseErrorMessage(value.message);
          }
          if (value === 'complete') {
            return createSseCompleteMessage();
          }
          return createSseMessage('message', value);
        })
        .join('')
    )
  );
}
