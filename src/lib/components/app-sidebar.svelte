<script lang="ts">
 import CalendarIcon from "@lucide/svelte/icons/calendar";
 import HouseIcon from "@lucide/svelte/icons/house";
 import InboxIcon from "@lucide/svelte/icons/inbox";
 import Activity from "@lucide/svelte/icons/activity";
 import SettingsIcon from "@lucide/svelte/icons/settings";
 import * as Sidebar from "$lib/components/ui/sidebar/index.js";
 
 // Menu items.
 const items = [
  {
   title: "Home",
   url: "/",
   icon: HouseIcon,
  },
  {
   title: "Entry",
   url: "/entry",
   icon: InboxIcon,
  },
  {
   title: "Reports",
   url: "/reports",
   icon: CalendarIcon,
  },
  {
   title: "Analysis",
   url: "/analysis",
   icon: CalendarIcon,
  },
  {
   title: "Activity",
   url: "/activity",
   icon: Activity,
  },
  {
   title: "Settings",
   url: "/settings",
   icon: SettingsIcon,
  },
 ];
</script>
 

<Sidebar.Root>
		<Sidebar.Content>
			<div class="flex-1">
				<Sidebar.Group>
					<Sidebar.GroupLabel>Application</Sidebar.GroupLabel>
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							{#each items as item (item.title)}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton>
										{#snippet child({ props })}
											<a href={item.url} {...props}>
												<item.icon />
												<span>{item.title}</span>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group>
			</div>
		</Sidebar.Content>
</Sidebar.Root>
