<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Menu } from '@lucide/svelte';
	import { authClient } from '$lib/client';
	import { goto } from '$app/navigation';
</script>

<header
	class="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6"
>
	<Sidebar.Trigger asChild let:builder>
		<Button builders={[builder]} variant="outline" size="icon" class="shrink-0 md:hidden">
			<Menu class="h-5 w-5" />
			<span class="sr-only">Toggle navigation menu</span>
		</Button>
	</Sidebar.Trigger>
	<div class="w-full flex-1">
		<h1 class="text-lg font-semibold">Playlist Search</h1>
	</div>
	<Button
		variant="outline"
		onclick={async () =>
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						goto('/auth/sign-in');
					}
				}
			})}>Sign Out</Button
	>
</header>