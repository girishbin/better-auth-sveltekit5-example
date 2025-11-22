<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { authClient } from '$lib/client';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Fuse from 'fuse.js';
	import { onMount } from 'svelte';

	import AppHeader from '$lib/components/app-header.svelte';

	const session = authClient.useSession();
	let isSyncing = $state(false);
	let playlists = $state<any[]>([]);
	let searchQuery = $state('');
	let fuse = $state<Fuse<any> | null>(null);

	let allVideos = $derived.by(() => {
		return playlists.flatMap((playlist) =>
			(playlist.items || []).map((item: any) => ({
				...item,
				playlistTitle: playlist.snippet.title,
				playlistId: playlist.id
			}))
		);
	});

	onMount(() => {
		const storedPlaylists = localStorage.getItem('youtubePlaylists');
		if (storedPlaylists) {
			playlists = JSON.parse(storedPlaylists);
			// Fuse will be initialized by the effect below or we can just init here if we want
			// But since allVideos is derived, we should probably init fuse when allVideos changes or just init with allVideos
		}
	});

	// Re-init fuse when allVideos changes
	$effect(() => {
		if (allVideos.length > 0) {
			initFuse(allVideos);
		}
	});

	function initFuse(data: any[]) {
		const options = {
			keys: ['snippet.title', 'snippet.description'],
			threshold: 0.3
		};
		fuse = new Fuse(data, options);
	}

	let selectedPlaylistId = $state('all');
	let sortOrder = $state('newest');

	let filteredVideos = $derived.by(() => {
		let videos = [...allVideos];
		
		if (selectedPlaylistId !== 'all') {
			videos = videos.filter((v) => v.playlistId === selectedPlaylistId);
		}

		// Sort videos
		videos.sort((a, b) => {
			const dateA = new Date(a.snippet.publishedAt).getTime();
			const dateB = new Date(b.snippet.publishedAt).getTime();
			return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
		});

		if (!searchQuery) return videos;
		
		const localFuse = new Fuse(videos, {
			keys: ['snippet.title', 'snippet.description'],
			threshold: 0.3
		});
		
		return localFuse.search(searchQuery).map((result) => result.item);
	});

	async function syncPlaylists() {
		isSyncing = true;
		
		const promise = (async () => {
			// Prepare existing ETags map
			const existingEtags = playlists.reduce((acc, playlist) => {
				if (playlist.id && playlist.etag) {
					acc[playlist.id] = playlist.etag;
				}
				return acc;
			}, {} as Record<string, string>);

			const response = await fetch('/api/sync-youtube', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ existingEtags })
			});

			if (!response.ok) {
				throw new Error('Failed to sync playlists');
			}

			const { updated, unchanged } = await response.json();
			
			// Merge results
			const newPlaylistsMap = new Map();
			
			// Add updated playlists
			updated.forEach((p: any) => newPlaylistsMap.set(p.id, p));
			
			// Add unchanged playlists from local state
			unchanged.forEach((id: string) => {
				const existing = playlists.find(p => p.id === id);
				if (existing) {
					newPlaylistsMap.set(id, existing);
				}
			});

			playlists = Array.from(newPlaylistsMap.values());
			localStorage.setItem('youtubePlaylists', JSON.stringify(playlists));
			return updated.length;
		})();

		toast.promise(promise, {
			loading: 'Syncing playlists...',
			success: (count) => `Sync complete! Updated ${count} playlists.`,
			error: 'Failed to sync playlists'
		});

		try {
			await promise;
		} catch (error) {
			console.error('Error syncing playlists:', error);
		} finally {
			isSyncing = false;
		}
	}
	let playingVideoId = $state<string | null>(null);

	$effect(() => {
		sortOrder;
		selectedPlaylistId;
		searchQuery;
		playingVideoId = null;
	});

	function togglePlay(videoId: string) {
		if (playingVideoId === videoId) {
			playingVideoId = null;
		} else {
			playingVideoId = videoId;
		}
	}
	let sortedPlaylists = $derived.by(() => {
		return [...playlists].sort((a, b) => a.snippet.title.localeCompare(b.snippet.title));
	});
	$effect(() => {
		if (selectedPlaylistId !== 'all') {
			const playlist = playlists.find(p => p.id === selectedPlaylistId);
			if (playlist?.snippet?.title === 'Watch Later') {
				toast.info('Note: Syncing the "Watch Later" playlist is not supported by the YouTube API.');
			}
		}
	});
</script>

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<AppHeader />
		<div class="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-bold tracking-tight">Dashboard</h2>
				<div class="flex items-center gap-2">
					<Button onclick={syncPlaylists} disabled={isSyncing}>
						{isSyncing ? 'Syncing...' : 'Sync Playlists'}
					</Button>
				</div>
			</div>

			<div class="space-y-4">
				<div class="flex w-full max-w-3xl flex-col gap-4 md:flex-row md:items-center md:gap-2">
					<div class="w-full md:w-1/4 md:min-w-[200px]">
						<select
							class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							bind:value={selectedPlaylistId}
						>
							<option value="all">All Playlists</option>
							{#each sortedPlaylists as playlist}
								<option value={playlist.id}>{playlist.snippet.title}</option>
							{/each}
						</select>
					</div>
					<div class="w-full md:flex-1">
						<Input type="text" placeholder="Search videos..." bind:value={searchQuery} />
					</div>
					<div class="flex items-center space-x-2">
						<Switch
							id="sort-mode"
							checked={sortOrder === 'newest'}
							onCheckedChange={(v) => (sortOrder = v ? 'newest' : 'oldest')}
						/>
						<Label for="sort-mode">Newest First</Label>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each filteredVideos as video}
						<Card.Root>
							<Card.Header>
								<Card.Title class="line-clamp-1 text-base" title={video.snippet.title}>
									{video.snippet.title}
								</Card.Title>
								<Card.Description class="line-clamp-1">
									{video.snippet.channelTitle} • {video.playlistTitle}
								</Card.Description>
							</Card.Header>
							<Card.Content>
								<div class="aspect-video w-full overflow-hidden rounded-md bg-muted relative group">
									{#if playingVideoId === video.snippet.resourceId.videoId}
										<iframe
											width="100%"
											height="100%"
											src={`https://www.youtube.com/embed/${video.snippet.resourceId.videoId}?autoplay=1`}
											title={video.snippet.title}
											frameborder="0"
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowfullscreen
											class="absolute inset-0"
										></iframe>
									{:else}
										{#if video.snippet.thumbnails?.medium?.url}
											<img
												src={video.snippet.thumbnails.medium.url}
												alt={video.snippet.title}
												class="h-full w-full object-cover"
											/>
										{:else}
											<div class="flex h-full items-center justify-center text-muted-foreground">
												No Thumbnail
											</div>
										{/if}
										<button 
											class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
											onclick={() => togglePlay(video.snippet.resourceId.videoId)}
										>
											<div class="rounded-full bg-white/90 p-3 shadow-lg">
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-black">
													<path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
												</svg>
											</div>
										</button>
									{/if}
								</div>
								<p class="text-muted-foreground mt-2 text-sm line-clamp-2" title={video.snippet.description}>
									{video.snippet.description}
								</p>
							</Card.Content>
							<Card.Footer>
								<Button
									variant="outline"
									class="w-full"
									href={`https://www.youtube.com/watch?v=${video.snippet.resourceId.videoId}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									Watch on YouTube
								</Button>
							</Card.Footer>
						</Card.Root>
					{/each}
				</div>

				{#if filteredVideos.length === 0 && allVideos.length > 0 && !(selectedPlaylistId !== 'all' && playlists.find(p => p.id === selectedPlaylistId)?.snippet?.title === 'Watch Later')}
					<p class="text-muted-foreground">No videos found matching your search.</p>
				{/if}
				{#if allVideos.length === 0}
					<p class="text-muted-foreground">
						No videos found. Click "Sync Playlists" to get started.
					</p>
				{/if}
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
