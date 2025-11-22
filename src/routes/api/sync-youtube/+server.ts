import { json } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { syncUserPlaylists } from '$lib/server/youtube';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await syncUserPlaylists(session.user.id);
		return json({ playlists: data });
	} catch (error) {
		console.error('Error syncing YouTube playlists:', error);
		return json({ error: 'Failed to sync playlists' }, { status: 500 });
	}
};
