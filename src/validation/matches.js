import { z } from 'zod';

/**
 * Match status constant
 */
export const MATCH_STATUS = {
    SCHEDULED: 'scheduled',
    LIVE: 'live',
    FINISHED: 'finished',
};

/**
 * Query schema for listing matches
 * Optional limit, coerced to positive integer, max 100
 */
export const listMatchesQuerySchema = z.object({
    limit: z
        .coerce.number()
        .int()
        .positive()
        .max(100)
        .optional(),
});

/**
 * Route param schema for match ID
 * Required positive integer (coerced)
 */
export const matchIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/**
 * Helper schema to validate ISO date strings
 */
const isoDateString = z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid ISO date string',
    });

/**
 * Create match schema
 */
export const createMatchSchema = z
    .object({
        sport: z.string().min(1, 'Sport is required'),
        homeTeam: z.string().min(1, 'Home team is required'),
        awayTeam: z.string().min(1, 'Away team is required'),

        startTime: isoDateString,
        endTime: isoDateString,

        homeScore: z.coerce.number().int().nonnegative().optional(),
        awayScore: z.coerce.number().int().nonnegative().optional(),
    })
    .superRefine((data, ctx) => {
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);

        if (end <= start) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'endTime must be after startTime',
                path: ['endTime'],
            });
        }
    });

/**
 * Update score schema
 */
export const updateScoreSchema = z.object({
    homeScore: z.coerce.number().int().nonnegative(),
    awayScore: z.coerce.number().int().nonnegative(),
});
