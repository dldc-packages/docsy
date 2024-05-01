class NoErrorThrownError extends Error {}

export function getError(call: () => unknown): unknown {
  try {
    call();
    throw new NoErrorThrownError();
  } catch (error: unknown) {
    return error;
  }
}
