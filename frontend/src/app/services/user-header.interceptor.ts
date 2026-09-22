import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

const withReadableApiErrors = (request$: Observable<HttpEvent<unknown>>) =>
  request$.pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const responseBody = error.error as { error?: unknown; message?: unknown } | string | null;
      const apiMessage =
        typeof responseBody === 'string'
          ? responseBody
          : String(responseBody?.error || responseBody?.message || '').trim();
      const readableError = new Error(
        apiMessage || (error.status === 0
          ? 'Unable to connect to the server. Check that the backend is running.'
          : 'The request could not be completed. Please try again.'),
      ) as Error & { status?: number };
      readableError.status = error.status;
      return throwError(() => readableError);
    }),
  );

export const userHeaderInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const currentUserId =
    req.headers.get('X-User-Id') ||
    sessionStorage.getItem('blgf_current_user') ||
    localStorage.getItem('blgf_current_user');
  if (!currentUserId) {
    return withReadableApiErrors(next(req));
  }
  const cloned = req.clone({
    setHeaders: { 'X-User-Id': currentUserId },
  });
  return withReadableApiErrors(next(cloned));
};
