<script>
	import { authClient } from '$lib/client';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	import AppHeader from '$lib/components/app-header.svelte';

	const session = authClient.useSession();
</script>

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<AppHeader />
		<div class="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
			<Card.Root class="w-[350px]">
				<Card.Header>
					<Card.Title>User</Card.Title>
					<Card.Description>Welcome to the dashboard</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center gap-2">
						<Avatar.Root>
							<Avatar.Image src={$session.data?.user.image} />
							<Avatar.Fallback>
								{$session.data?.user.name[0]}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="">
							<h3 class="text-sm">
								{$session.data?.user.name}
							</h3>
							<p class="text-muted-foreground text-xs">
								{$session.data?.user.email}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
