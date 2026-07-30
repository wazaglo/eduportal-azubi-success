import { component$, useSignal } from "@builder.io/qwik";
import { SearchIcon, FilterIcon, MoreHorizontalIcon, MailIcon, ShieldIcon, UserXIcon } from "lucide-qwik";
import { Button } from "~/components/atoms/Button";
import { Badge } from "~/components/atoms/Badge";
import { Avatar } from "~/components/atoms/Avatar";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "Student" | "Admin";
  status: "active" | "inactive" | "suspended";
  joined: string;
  conversations: number;
}

const users: UserData[] = [
  { id: "1", name: "Sarah Johnson", email: "sarah@example.com", role: "Student", status: "active", joined: "2024-01-15", conversations: 47 },
  { id: "2", name: "Michael Chen", email: "michael@example.com", role: "Student", status: "active", joined: "2024-02-20", conversations: 32 },
  { id: "3", name: "Emily Rodriguez", email: "emily@example.com", role: "Student", status: "inactive", joined: "2024-03-10", conversations: 12 },
  { id: "4", name: "David Kim", email: "david@example.com", role: "Admin", status: "active", joined: "2023-11-01", conversations: 89 },
  { id: "5", name: "Lisa Thompson", email: "lisa@example.com", role: "Student", status: "suspended", joined: "2024-04-05", conversations: 5 },
  { id: "6", name: "James Wilson", email: "james@example.com", role: "Student", status: "active", joined: "2024-05-12", conversations: 23 },
  { id: "7", name: "Anna Martinez", email: "anna@example.com", role: "Admin", status: "active", joined: "2023-08-22", conversations: 156 },
  { id: "8", name: "Robert Taylor", email: "robert@example.com", role: "Student", status: "inactive", joined: "2024-06-18", conversations: 8 },
];

export default component$(() => {
  const searchQuery = useSignal("");
  const selectedRole = useSignal<"all" | "Student" | "Admin">("all");
  const selectedStatus = useSignal<"all" | "active" | "inactive" | "suspended">("all");

  const filteredUsers = () => {
    return users.filter((u) => {
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      if (selectedRole.value !== "all" && u.role !== selectedRole.value) return false;
      if (selectedStatus.value !== "all" && u.status !== selectedStatus.value) return false;
      return true;
    });
  };

  return (
    <div class="space-y-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">User Management</h1>
          <p class="text-text-muted text-sm mt-1">Manage all registered users</p>
        </div>
        <Button variant="primary">Invite User</Button>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="search"
            placeholder="SearchIcon users..."
            value={searchQuery.value}
            onInput$={(e: any) => (searchQuery.value = e.target.value)}
            class={[
              "w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-sm",
              "placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            ].join(" ")}
          />
        </div>
        <div class="flex gap-2">
          <select
            value={selectedRole.value}
            onChange$={(e: any) => (selectedRole.value = e.target.value)}
            class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Roles</option>
            <option value="Student">Student</option>
            <option value="Admin">Admin</option>
          </select>
          <select
            value={selectedStatus.value}
            onChange$={(e: any) => (selectedStatus.value = e.target.value)}
            class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-surface overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border bg-surface-secondary">
                <th class="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">User</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Role</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Joined</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Conversations</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {filteredUsers().map((user) => (
                <tr key={user.id} class="hover:bg-surface-secondary transition-colors">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <Avatar name={user.name} size="sm" />
                      <div>
                        <p class="text-sm font-medium text-text-primary">{user.name}</p>
                        <p class="text-xs text-text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <Badge variant={user.role === "Admin" ? "info" : "default"}>{user.role}</Badge>
                  </td>
                  <td class="px-4 py-3">
                    <Badge
                      variant={
                        user.status === "active" ? "success" : user.status === "inactive" ? "warning" : "danger"
                      }
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td class="px-4 py-3 text-sm text-text-secondary">{user.joined}</td>
                  <td class="px-4 py-3 text-sm text-text-secondary">{user.conversations}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button class="p-2 rounded-lg hover:bg-surface-tertiary text-text-muted hover:text-text-primary transition-colors" aria-label="Send email">
                        <MailIcon class="h-4 w-4" />
                      </button>
                      <button class="p-2 rounded-lg hover:bg-surface-tertiary text-text-muted hover:text-text-primary transition-colors" aria-label="Manage permissions">
                        <ShieldIcon class="h-4 w-4" />
                      </button>
                      <button class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-text-muted hover:text-red-600 transition-colors" aria-label="Suspend user">
                        <UserXIcon class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
