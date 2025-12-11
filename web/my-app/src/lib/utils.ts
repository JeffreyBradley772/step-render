import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { z } from "zod"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function fetchAndValidate<T>(
  url: string,
  zodSchema: z.ZodType<T>,
  options?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return { success: false, error: `HTTP error! status: ${response.status}` };
    }
    const data = await response.json();
    const result = zodSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: result.error.message };
    }
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
