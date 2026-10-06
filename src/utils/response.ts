import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
    details: any[];
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  meta: ApiResponse['meta'] | string | null = null,
  statusCode = 200,
  extraMeta?: ApiResponse['meta']
): Response {
  let metaData: ApiResponse['meta'] | null = null;
  let message: string | undefined = undefined;
  let finalStatusCode = statusCode;

  if (typeof meta === 'string') {
    message = meta;
    metaData = extraMeta !== undefined ? extraMeta : null;
  } else {
    metaData = meta !== undefined ? meta : null;
  }

  return res.status(finalStatusCode).json({
    success: true,
    data,
    meta: metaData,
    ...(message ? { message } : {})
  });
}

export function sendError(
  res: Response,
  errorCodeOrMessage = 'INTERNAL_ERROR',
  messageOrStatusCode: string | number = 'An error occurred',
  statusCodeOrErrorCode: number | string = 400,
  details: any = []
): Response {
  let errorCode: string;
  let message: string;
  let statusCode = 400;
  let detailsList: any[] = [];

  if (typeof messageOrStatusCode === 'number') {
    // Legacy signature: sendError(res, message, statusCode, errorCode, details)
    message = errorCodeOrMessage;
    statusCode = messageOrStatusCode;
    errorCode = typeof statusCodeOrErrorCode === 'string' ? statusCodeOrErrorCode : 'INTERNAL_ERROR';
    detailsList = Array.isArray(details) ? details : details ? [details] : [];
  } else {
    // Primary signature: sendError(res, errorCode, message, statusCode = 400, details = [])
    errorCode = errorCodeOrMessage;
    message = String(messageOrStatusCode);
    statusCode = typeof statusCodeOrErrorCode === 'number' ? statusCodeOrErrorCode : 400;
    detailsList = Array.isArray(details) ? details : details ? [details] : [];
  }

  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: errorCode,
      message,
      details: detailsList
    }
  });
}
