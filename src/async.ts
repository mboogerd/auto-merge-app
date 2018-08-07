// FIXME: Why is this hack needed to make typescript `setTimeout` to be available at runtime?
declare var setTimeout: any

export namespace Async {

  /**
   * Execute the given function `f` over the array of `ss` in parallel and return
   * @param ss 
   * @param f 
   */
  export async function parMap<S, T>(ss: Array<S>, f: (s: S) => Promise<T>): Promise<Array<T>> {
    return Promise.all(ss.map(f))
  }

  /**
   * 
   * @param timeout The number of milliseconds to wait until the returned promise completes
   */
  export async function timeoutPromise(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout))
  }

  /**
   * @param repeat The function call to repeat until `predicate` is satisfied
   * @param predicate Repeat `repeat` until this is true
   * @param interval The number of milliseconds to wait until the next invocation attempt
   */
  export async function repeatUntil<T>(repeat: () => Promise<T>, predicate: (t: T) => Boolean, start: number, interval: number): Promise<T> {
    while (true) {
      await timeoutPromise(start)
      const t = await repeat()
      if (predicate(t))
        return t
      await timeoutPromise(interval)
    }
  }
}