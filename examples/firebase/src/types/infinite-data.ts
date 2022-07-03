export interface InfiniteData<T, P> {
  data: T;
  nextCursor?: P;
  previousCursor?: P;
}
