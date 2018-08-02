export namespace Async {

  /**
   * Execute the given function `f` over the array of `ss` in parallel and return
   * @param ss 
   * @param f 
   */
  export async function parMap<S, T>(ss: Array<S>, f: (s: S) => Promise<T>): Promise<Array<T>> {
    return Promise.all(ss.map(f))
  }
}