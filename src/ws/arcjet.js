import 'dotenv/config';
import arcjet, { detectBot, shield, slidingWindow } from '@arcjet/node';

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';

if (!arcjetKey && process.env.NODE_ENV === 'production') {
    throw new Error('ARCJET_KEY environment variable required in production');
}

if (!arcjetKey) {
    console.warn('⚠ ARCJET_KEY not set — Arcjet disabled');
}

function createArcjet(rules) {
    if (!arcjetKey) return null;

    return arcjet({
        key: arcjetKey,
        rules,
    });
}

export const httpArcjet = createArcjet([
    shield({ mode: arcjetMode }),
    detectBot({
        mode: arcjetMode,
        allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'],
    }),
    slidingWindow({ mode: arcjetMode, interval: '10s', max: 50 }),
]);

export const wsArcjet = createArcjet([
    shield({ mode: arcjetMode }),
    detectBot({
        mode: arcjetMode,
        allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'],
    }),
    slidingWindow({ mode: arcjetMode, interval: '2s', max: 5 }),
]);

export function securityMiddleware() {
    return async (req, res, next) => {
        if (!httpArcjet) return next();

        try {
            const decision = await httpArcjet.protect(req);

            if (decision.isDenied()) {
                console.warn('Arcjet denied request:', decision.reason);

                if (decision.reason.isRateLimit()) {
                    return res.status(429).json({ error: 'Too many requests.' });
                }

                return res.status(403).json({ error: 'Forbidden.' });
            }

            return next();
        } catch (err) {
            console.error('Arcjet middleware error:', err);
            return res.status(503).json({ error: 'Service unavailable' });
        }
    };
}
