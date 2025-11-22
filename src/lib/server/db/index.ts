import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new Database(env.DATABASE_URL);
export const db = drizzle(client, { schema });

import { eq, and } from 'drizzle-orm';

export async function getAccount(userId: string, providerId: string = 'google') {
	const result = await db
		.select()
		.from(schema.account)
		.where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, providerId)))
		.limit(1);
	return result[0];
}