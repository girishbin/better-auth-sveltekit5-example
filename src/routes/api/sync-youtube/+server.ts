import { json } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { syncUserPlaylists } from '$lib/server/youtube';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session?.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const { existingEtags } = await request.json().catch(() => ({ existingEtags: {} }));
		const result = await syncUserPlaylists(session.user.id, existingEtags || {});
		return json(result);
	} catch (error) {
		console.error('Error syncing playlists:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};
