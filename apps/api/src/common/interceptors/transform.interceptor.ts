import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result: unknown) => {
        // Paginated responses already carry { data: T[], meta: {...} } — pass through as-is.
        if (
          result !== null &&
          typeof result === 'object' &&
          'meta' in (result as Record<string, unknown>)
        ) {
          return result;
        }
        return { data: result };
      }),
    );
  }
}
