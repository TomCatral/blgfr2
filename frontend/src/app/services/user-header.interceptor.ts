import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

export const userHeaderInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const currentUserId =
    sessionStorage.getItem('blgf_current_user') ||
    localStorage.getItem('blgf_current_user');
  if (!currentUserId) {
    return next(req);
  }
  const cloned = req.clone({
    setHeaders: { 'X-User-Id': currentUserId },
  });
  return next(cloned);
};