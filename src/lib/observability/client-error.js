/** @param {unknown} err */
export function reportRecoverableClientError(err) {
  if (typeof globalThis.reportError === "function" && err instanceof Error) {
    globalThis.reportError(err);
  }
}
