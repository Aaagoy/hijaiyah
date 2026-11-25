/** Runs at most one async job at a time; calls made while busy are ignored (resolve to null). */
export function createSingleFlight() {
  let running = false;
  return {
    busy: () => running,
    async run<T>(job: () => Promise<T>): Promise<T | null> {
      if (running) return null;
      running = true;
      try {
        return await job();
      } finally {
        running = false;
      }
    },
  };
}
