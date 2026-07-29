import { component$, useSignal, useStore, $ } from "@builder.io/qwik";
import { UserIcon, CameraIcon, SaveIcon, MailIcon, ShieldIcon, BellIcon } from "lucide-qwik";
import { Button } from "~/components/atoms/Button";
import { Input } from "~/components/atoms/Input";
import { Avatar } from "~/components/atoms/Avatar";
import { Badge } from "~/components/atoms/Badge";
import { useAuth } from "~/stores/auth-store";

export default component$(() => {
  const auth = useAuth();
  const isSaving = useSignal(false);
  const saved = useSignal(false);
  const activeTab = useSignal<"profile" | "security" | "notifications">("profile");

  const profileForm = useStore({
    name: auth.state.user?.name || "John Doe",
    email: auth.state.user?.email || "john@example.com",
    bio: "Computer Science student passionate about AI and machine learning.",
  });

  const securityForm = useStore({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileSave = $(async () => {
    isSaving.value = true;
    await new Promise((r) => setTimeout(r, 1000));
    isSaving.value = false;
    saved.value = true;
    setTimeout(() => (saved.value = false), 3000);
  });

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: UserIcon },
    { id: "security" as const, label: "Security", icon: ShieldIcon },
    { id: "notifications" as const, label: "Notifications", icon: BellIcon },
  ];

  return (
    <div class="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Profile Settings</h1>
        <p class="text-text-muted text-sm mt-1">Manage your account settings and preferences</p>
      </div>

      <div class="rounded-2xl border border-border bg-surface p-6">
        <div class="flex flex-col sm:flex-row items-center gap-6">
          <div class="relative group">
            <Avatar name={profileForm.name} size="xl" />
            <button
              class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Change avatar"
            >
              <CameraIcon class="h-5 w-5 text-white" />
            </button>
          </div>
          <div class="text-center sm:text-left">
            <h2 class="text-xl font-bold text-text-primary">{profileForm.name}</h2>
            <p class="text-sm text-text-muted">{profileForm.email}</p>
            <div class="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              <Badge variant="success">Student</Badge>
              <Badge variant="info">Verified</Badge>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-1 rounded-xl bg-surface-tertiary p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick$={() => (activeTab.value = tab.id)}
            class={[
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab.value === tab.id
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            <tab.icon class="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div class="rounded-2xl border border-border bg-surface p-6">
        {activeTab.value === "profile" && (
          <form
            onSubmit$={(e) => {
              e.preventDefault();
              handleProfileSave();
            }}
            class="space-y-4"
          >
            <Input
              name="name"
              label="Full Name"
              value={profileForm.name}
              onInput$={(val) => (profileForm.name = val)}
            />
            <Input
              name="email"
              label="Email"
              type="email"
              value={profileForm.email}
              onInput$={(val) => (profileForm.email = val)}
            />
            <div>
              <label for="bio" class="text-sm font-medium text-text-primary block mb-1.5">
                Bio
              </label>
              <textarea
                id="bio"
                value={profileForm.bio}
                onInput$={(e: any) => (profileForm.bio = e.target.value)}
                rows={3}
                class={[
                  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm",
                  "placeholder:text-text-muted resize-none",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                  "transition-all duration-200",
                ].join(" ")}
              />
            </div>
            <div class="flex items-center gap-3 pt-2">
              <Button type="submit" variant="primary" loading={isSaving.value}>
                <SaveIcon class="h-4 w-4" />
                SaveIcon Changes
              </Button>
              {saved.value && (
                <span class="text-sm text-green-600 font-medium">Saved successfully!</span>
              )}
            </div>
          </form>
        )}

        {activeTab.value === "security" && (
          <form
            onSubmit$={(e) => {
              e.preventDefault();
              handleProfileSave();
            }}
            class="space-y-4"
          >
            <Input
              name="currentPassword"
              label="Current Password"
              type="password"
              value={securityForm.currentPassword}
              onInput$={(val) => (securityForm.currentPassword = val)}
            />
            <Input
              name="newPassword"
              label="New Password"
              type="password"
              value={securityForm.newPassword}
              onInput$={(val) => (securityForm.newPassword = val)}
            />
            <Input
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              value={securityForm.confirmPassword}
              onInput$={(val) => (securityForm.confirmPassword = val)}
            />
            <Button type="submit" variant="primary">
              <SaveIcon class="h-4 w-4" />
              Update Password
            </Button>
          </form>
        )}

        {activeTab.value === "notifications" && (
          <div class="space-y-4">
            {[
              { label: "Email notifications", description: "Receive updates via email" },
              { label: "Push notifications", description: "Receive push notifications" },
              { label: "Study reminders", description: "Get reminded about study sessions" },
              { label: "Weekly summary", description: "Receive weekly activity summary" },
            ].map((item) => (
              <div
                key={item.label}
                class="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div>
                  <p class="text-sm font-medium text-text-primary">{item.label}</p>
                  <p class="text-xs text-text-muted">{item.description}</p>
                </div>
                <button
                  role="switch"
                  aria-checked="true"
                  class="relative h-6 w-11 rounded-full bg-primary-600 transition-colors"
                >
                  <span class="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
