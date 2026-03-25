export async function runInParallel<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  return Promise.all(items.map((item) => worker(item)));
}
