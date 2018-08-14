/**
 * callbag-graceful
 * ----------------
 *
 * Callbag operator for graceful error handling.
 * 
 * When an Error occurs while calling the sink, this operator terminates both
 * the talkback and the sink. Errors thrown while terminating the sink are not
 * catched since terminating it twice is forbidden by the spec.
 * Also, note that the operator can only catch errors thrown synchronously when
 * calling the sink. Errors thrown in asynchronous events must still be handled
 * manually.
 * 
 * Works on either pullable or listenable sources.
 *
 * Installation:
 * `npm install callbag-graceful`
 *
 * Example:
 * 
 *     import graceful from 'callbag-graceful';
 *     import map from 'callbag-map';
 *     import pipe from 'callbag-pipe';
 *     import of from 'callbag-of';
 *     import subscribe from 'callbag-subscribe';
 * 
 *     pipe(
 *       of(0, 1, 2, 'foo', 3),
 *       graceful,
 *       map(x => {
 *         if (typeof x === 'number') return x;
 *         else throw new Error('Not a number');
 *       }),
 *       subscribe({
 *         next: x => console.log(`Next: ${x}`),
 *         error: e => console.log(`Error: ${e.message}`),
 *         complete: () => console.log('Complete')
 *       })
 *     );                                          // Next: 0
 *                                                 // Next: 1
 *                                                 // Next: 2
 *                                                 // Error: Not a number
 */

export default source => (start, sink) => {
  if (start !== 0) return;
  let talkback;
  source(0, (t, d) => {
    if (t === 0) talkback = d;
    if (t === 2) {
      sink(t, d);
      return;
    }
    try {
      sink(t, d);
    } catch (e) {
      talkback(2);
      sink(2, e);
    }
  });
};
