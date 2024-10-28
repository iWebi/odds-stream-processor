export function isEmpty(value: any): boolean {
  return value === null || value === undefined;
}

export function isAppError(error: any): boolean {
  return (
    typeof error === "object" &&
    error.hasOwnProperty("body") &&
    error.hasOwnProperty("statusCode") &&
    error.hasOwnProperty("statusType")
  );
}

// nodejs does not have native sleep. Emulate the behavior with timeout promise
export async function sleep(millis: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
