import express from 'express';
import { db } from '../db/db.js';
import { commentary, matches } from '../db/schema.js';

import { matchIdParamSchema } from '../validation/matches.js';
import { createCommentarySchema } from '../validation/commentary.js';
import { listCommentaryQuerySchema } from '../validation/commentary.js';
import { eq, desc } from 'drizzle-orm';

const MAX_LIMIT = 100

const commentaryRouter = express.Router({ mergeParams: true });

/**
 * POST /matches/:id/commentary
 * Create a new commentary entry for a match
 */


commentaryRouter.get('/', async (req, res) => {
    // 1️⃣ Validate route params
    const paramsParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
        return res.status(400).json({
            error: 'Invalid match id',
            details: paramsParsed.error.flatten(),
        });
    }

    // 2️⃣ Validate query params
    const queryParsed = listCommentaryQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
        return res.status(400).json({
            error: 'Invalid query parameters',
            details: queryParsed.error.flatten(),
        });
    }

    const matchId = paramsParsed.data.id;

    // Apply default + safety cap
    const requestedLimit = queryParsed.data.limit ?? MAX_LIMIT;
    const limit = Math.min(requestedLimit, MAX_LIMIT);

    try {

        // 3️⃣ Fetch commentary
        const results = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        return res.status(200).json({
            data: results,
            count: results.length,
        });

    } catch (error) {
        console.error('Failed to fetch commentary:', error);

        return res.status(500).json({
            error: 'Failed to fetch commentary',
        });
    }
});

commentaryRouter.post('/', async (req, res) => {
    // 1️⃣ Validate route params
    const paramsParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
        return res.status(400).json({
            error: 'Invalid match id',
            details: paramsParsed.error.flatten(),
        });
    }

    // 2️⃣ Validate request body
    const bodyParsed = createCommentarySchema.safeParse(req.body);

    if (!bodyParsed.success) {
        return res.status(400).json({
            error: 'Invalid request body',
            details: bodyParsed.error.flatten(),
        });
    }

    const payload = bodyParsed.data;
   const matchId = paramsParsed.data.id;
    try {

        const [match] = await db
            .select({id: matches.id})
            .from(matches)
            .where(eq(matches.id, matchId))
            .limit(1)

        if(!match){
            return res.status(404).json({error: 'Match not Found'})
        }

        // 3️⃣ Insert into database
        const [result] = await db
            .insert(commentary)
            .values({
                matchId,
                ...payload,
            })
            .returning();

        if(res.app.locals.broadcastCommentary){
            res.app.locals.broadcastCommentary(matchId, result);
        }

        return res.status(201).json({
            data: result,
        });

    } catch (error) {
        console.error('Failed to create commentary:', error);

        return res.status(500).json({
            error: 'Failed to create commentary',
        });
    }


});
export { commentaryRouter }
