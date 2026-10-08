import { Transform } from 'class-transformer';

/**
 * Parses "true"/"false" query strings. Reads the raw value from `obj` because the global
 * ValidationPipe's implicit conversion would otherwise turn the string "false" into `true`.
 */
export function QueryBoolean(): PropertyDecorator {
  return Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
    const raw = obj[key];
    if (raw === 'true' || raw === true) return true;
    if (raw === 'false' || raw === false) return false;
    return raw;
  });
}
