import { eq } from 'drizzle-orm';
import { db, pool } from './db/db.js';
import { matches } from './db/schema.js';

async function main() {
    try {
        console.log('Testing database connection...');

        // CREATE
        const [newMatch] = await db
            .insert(matches)
            .values({
                sport: 'Football',
                homeTeam: 'Team A',
                awayTeam: 'Team B'
            })
            .returning();

        console.log('✅ Created match:', newMatch);

        // READ
        const found = await db
            .select()
            .from(matches)
            .where(eq(matches.id, newMatch.id));

        console.log('✅ Read match:', found[0]);

        // UPDATE
        const [updated] = await db
            .update(matches)
            .set({ status: 'live' })
            .where(eq(matches.id, newMatch.id))
            .returning();

        console.log('✅ Updated match:', updated);

        // DELETE
        // await db.delete(matches).where(eq(matches.id, newMatch.id));
        // console.log('✅ Deleted match');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
        console.log('Pool closed.');
    }
}

main();
