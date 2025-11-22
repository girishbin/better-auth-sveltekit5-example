import { google, youtube_v3 } from 'googleapis';
import { getAccount } from '$lib/server/db';
import { env } from '$env/dynamic/private';

/**
 * Creates an authenticated YouTube API client for a given user.
 * It fetches the user's tokens from the database and handles token refresh if necessary.
 *
 * @param userId The ID of the user to authenticate as.
 * @returns A promise that resolves to an authenticated YouTube API v3 client instance.
 * @throws An error if the user's account or tokens are not found.
 */
export async function getYouTubeClient(userId: string): Promise<youtube_v3.Youtube> {
	// 1. Fetch user's account details from the database
	const account = await getAccount(userId, 'google');

	if (!account?.accessToken) {
		throw new Error(`Could not find access token for user ${userId}.`);
	}

	// 2. Create an OAuth2 client
	const oauth2Client = new google.auth.OAuth2(
		env.GOOGLE_CLIENT_ID,
		env.GOOGLE_CLIENT_SECRET,
		env.GOOGLE_REDIRECT_URI
	);

	// 3. Set the credentials on the OAuth2 client
	oauth2Client.setCredentials({
		access_token: account.accessToken,
		refresh_token: account.refreshToken
	});

	// Note: The googleapis library automatically handles token refreshing.
	// If the access token is expired, it will use the refresh token to get a new one
	// before making the API request. You can also listen for the 'tokens' event
	// on the oauth2Client to save the new tokens to your database.

	// 4. Return an initialized YouTube client
	return google.youtube({ version: 'v3', auth: oauth2Client });
}

/**
 * Fetches all playlists for the specified user (including private playlists).
 *
 * @param userId The ID of the user whose playlists are to be fetched.
 * @returns A promise that resolves to an array of the user's playlist items.
 */
export async function getUserPlaylists(userId: string): Promise<youtube_v3.Schema$Playlist[]> {
	try {
		const youtube = await getYouTubeClient(userId);
		const playlists: youtube_v3.Schema$Playlist[] = [];
		let nextPageToken: string | undefined | null = undefined;

		console.log(`Fetching playlists for user ${userId}...`);

		do {
			const response = await youtube.playlists.list({
				mine: true,
				part: ['snippet', 'contentDetails', 'status'],
				maxResults: 50,
				pageToken: nextPageToken || undefined
			});

			if (response.data.items) {
				playlists.push(...response.data.items);
			}

			nextPageToken = response.data.nextPageToken;
		} while (nextPageToken);

		console.log(`Found ${playlists.length} playlists for user ${userId}.`);
		return playlists;
	} catch (error) {
		console.error(`Failed to fetch playlists for user ${userId}:`, error);
		// Re-throw the error to be handled by the calling function (e.g., in a SvelteKit endpoint)
		throw error;
	}
}

/**
 * Fetches all items (videos) for a specific playlist.
 *
 * @param userId The ID of the user.
 * @param playlistId The ID of the playlist to fetch items for.
 * @returns A promise that resolves to an array of playlist items.
 */
export async function getPlaylistItems(
	userId: string,
	playlistId: string
): Promise<youtube_v3.Schema$PlaylistItem[]> {
	try {
		const youtube = await getYouTubeClient(userId);
		const playlistItems: youtube_v3.Schema$PlaylistItem[] = [];
		let nextPageToken: string | undefined | null = undefined;

		console.log(`Fetching items for playlist ${playlistId}...`);

		do {
			const response = await youtube.playlistItems.list({
				playlistId: playlistId,
				part: ['snippet', 'contentDetails', 'status'],
				maxResults: 50,
				pageToken: nextPageToken || undefined
			});

			if (response.data.items) {
				playlistItems.push(...response.data.items);
			}

			nextPageToken = response.data.nextPageToken;
		} while (nextPageToken);

		console.log(`Found ${playlistItems.length} items for playlist ${playlistId}.`);
		return playlistItems;
	} catch (error) {
		console.error(`Failed to fetch items for playlist ${playlistId}:`, error);
		throw error;
	}
}

/**
 * Fetches all playlists and their items for a user.
 *
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of playlists with their items.
 */
export async function syncUserPlaylists(userId: string) {
	const youtube = await getYouTubeClient(userId);
	const playlists = await getUserPlaylists(userId);

	// Fetch user's channel to get "Watch Later" playlist ID
	try {
		const channelResponse = await youtube.channels.list({
			mine: true,
			part: ['contentDetails']
		});
		console.log('Channel Response:', JSON.stringify(channelResponse.data, null, 2));
		const relatedPlaylists = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists;
		console.log('Related Playlists:', relatedPlaylists);
		
		let watchLaterId = relatedPlaylists?.watchLater;

		// Fallback to 'WL' if not found (common for newer API behavior)
		if (!watchLaterId) {
			console.log('Watch Later ID not found in channel details, using fallback "WL"');
			watchLaterId = 'WL';
		}

		if (watchLaterId) {
			console.log(`Found Watch Later playlist ID: ${watchLaterId}`);
			// Manually create a playlist object for Watch Later
			const watchLaterPlaylist: youtube_v3.Schema$Playlist = {
				id: watchLaterId,
				snippet: {
					title: 'Watch Later',
					description: 'Your Watch Later list',
					channelTitle: 'You'
				}
			};
			playlists.push(watchLaterPlaylist);
		}
	} catch (error) {
		console.error('Failed to fetch channel details for Watch Later playlist:', error);
	}

	const playlistsWithItems = await Promise.all(
		playlists.map(async (playlist) => {
			if (!playlist.id) return { ...playlist, items: [] };
			try {
				const items = await getPlaylistItems(userId, playlist.id);
				return { ...playlist, items };
			} catch (error) {
				console.error(`Failed to fetch items for playlist ${playlist.id}, skipping items.`, error);
				return { ...playlist, items: [] };
			}
		})
	);
	return playlistsWithItems;
}