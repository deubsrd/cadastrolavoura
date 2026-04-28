export type DbError = { code?: string; message?: string; status?: number } | null;
export type DbResult<TData = unknown> = { data?: TData; error: DbError };

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const isTransientDbError = (error: DbError) => {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST002" ||
    error?.status === 503 ||
    message.includes("schema cache") ||
    message.includes("database connection") ||
    message.includes("connection error")
  );
};

export async function withDbRetry<T extends DbResult>(operation: () => PromiseLike<T>, attempts = 3): Promise<T> {
  let result = await operation();
  for (let attempt = 1; result.error && isTransientDbError(result.error) && attempt < attempts; attempt += 1) {
    await wait(450 * attempt);
    result = await operation();
  }
  return result;
}