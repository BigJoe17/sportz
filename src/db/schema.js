import {pgTable, serial, text, timestamp, pgEnum, integer, check, jsonb} from 'drizzle-orm/pg-core';


export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);


export const matches = pgTable('matches', {
    id: serial('id').primaryKey(),
    sport: text('sport').notNull(),
    homeTeam: text('home_team').notNull(),
    awayTeam: text('away_team').notNull(),
    status: matchStatusEnum('status').notNull().default('scheduled'),
    startTime: timestamp('start_time'),
    endTime: timestamp('end_time'),
    homeScore: integer('home_score').notNull().default(0),
    awayScore: integer('away_score').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),

}, (table) => [
    check('matches_home_score_non_negative', sql`${table.homeScore} >= 0`),
    check('matches_away_score_non_negative', sql`${table.awayScore} >= 0`),
]);


export const commentary = pgTable('commentary', {
    id: serial('id').primaryKey(),
    matchID: integer('match_id').notNull().references(() => matches.id, {onDelete: 'cascade'}),
    minute: integer('minute'),
    sequence: integer('sequence'),
    period: text('period'),
    eventType: text('event_type'),
    actor: text('actor'),
    team: text('team'),
    message: text('message').notNull(),
    metadata: jsonb('metadata'),
    tags: text('tags').array(),
    createdAt: timestamp('created_at').notNull().defaultNow(),

},
    (table) => [
          check('commentary_minute_non_negative', sql`${table.minute} IS NULL OR ${table.minute} >= 0`),
         check('commentary_sequence_non_negative', sql`${table.sequence} IS NULL OR ${table.sequence} >= 0`),
    ]);


