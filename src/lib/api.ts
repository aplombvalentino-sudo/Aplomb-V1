import { NextResponse } from "next/server";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(
  code: string,
  message: string,
  status = 400
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

export function unauthorized(): NextResponse<ApiError> {
  return err("UNAUTHORIZED", "Authentication required", 401);
}

export function forbidden(): NextResponse<ApiError> {
  return err("FORBIDDEN", "You do not have access to this resource", 403);
}

export function notFound(resource = "Resource"): NextResponse<ApiError> {
  return err("NOT_FOUND", `${resource} not found`, 404);
}

export function serverError(message = "Internal server error"): NextResponse<ApiError> {
  return err("SERVER_ERROR", message, 500);
}
