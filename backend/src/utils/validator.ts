import { z } from 'zod';
import { ValidationError } from './errors';

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const formatted = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    throw new ValidationError('Validation failed', { issues: formatted });
  }

  return result.data;
}

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  nextToken: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});
