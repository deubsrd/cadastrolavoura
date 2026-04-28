export type DbError = { code?: string; details?: string | null; message?: string; status?: number } | null;
export type DbResult<TData = unknown> = { data?: TData; error: DbError };

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const isTransientDbError = (error: DbError) => {
  const message = error?.message?.toLowerCase() ?? "";
  const details = error?.details?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST001" ||
    error?.code === "PGRST002" ||
    error?.status === 503 ||
    message.includes("schema cache") ||
    message.includes("database client error") ||
    message.includes("database connection") ||
    message.includes("connection error") ||
    details.includes("no connection")
  );
};

export async function withDbRetry<T extends DbResult>(operation: () => PromiseLike<T>, attempts = 6): Promise<T> {
  let result = await operation();
  for (let attempt = 1; result.error && isTransientDbError(result.error) && attempt < attempts; attempt += 1) {
    await wait(650 * attempt);
    result = await operation();
  }
  return result;
}