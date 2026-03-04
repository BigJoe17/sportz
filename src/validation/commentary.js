import { z } from 'zod';

/**
 * Query schema for listing commentary
 * Optional limit: coerced, positive integer, max 100
 */
export const listCommentaryQuerySchema = z.object({
    limit: z
        .coerce
        .number()
        .int()
        .positive()
        .max(100)
        .optional(),
});

/**
 * Schema for creating commentary entries
 */
export const createCommentarySchema = z.object({

    minute: z.coerce.number().int().nonnegative(),

    sequence: z.coerce.number().int().nonnegative().optional(),

    period: z.string().min(1).optional(),

    eventType: z.string().min(1).optional(),

    actor: z.string().min(1).optional(),

    team: z.string().min(1).optional(),

    message: z.string().min(1, 'Message is required'),

    metadata: z.record( z.string(), z.any()).optional(),

    tags: z.array(z.string()).optional(),

});
