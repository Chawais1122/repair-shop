import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result: unknown) => {
        // File downloads are streamed as-is, never wrapped in the JSON envelope.
        if (result instanceof StreamableFile) return result;
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
