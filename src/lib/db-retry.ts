export type DbError = {
  code?: string;
  details?: string | null;
  message?: string;
  status?: number;
} | null;
export type DbResult<TData = unknown> = { data?: TData; error: DbError };

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const timeoutResult = <T extends DbResult>(ms: number) =>
  new Promise<T>((resolve) => {
    window.setTimeout(() => {
      resolve({ error: { code: "CLIENT_TIMEOUT", message: "Tempo de conexão esgotado." } } as T);
    }, ms);
  });

export const isTransientDbError = (error: DbError) => {
  const message = error?.message?.toLowerCase() ?? "";
  const details = error?.details?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST001" ||
    error?.code === "PGRST002" ||
    error?.code === "CLIENT_TIMEOUT" ||
    error?.status === 503 ||
    message.includes("schema cache") ||
    message.includes("database client error") ||
    message.includes("database connection") ||
    message.includes("connection error") ||
    details.includes("no connection")
  );
};

export async function withDbRetry<T extends DbResult>(
  operation: () => PromiseLike<T>,
  attempts = 6,
): Promise<T> {
  let result = await Promise.race([operation(), timeoutResult<T>(9000)]);
  for (
    let attempt = 1;
    result.error && isTransientDbError(result.error) && attempt < attempts;
    attempt += 1
  ) {
    await wait(650 * attempt);
    result = await Promise.race([operation(), timeoutResult<T>(9000)]);
  }
  return result;
}
