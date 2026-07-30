import { component$, Slot, useSignal } from "@builder.io/qwik";
import { Sidebar } from "~/components/organisms/Sidebar";
import { Header } from "~/components/organisms/Header";

export default component$(() => {
  const sidebarOpen = useSignal(false);

  return (
    <div class="flex h-screen overflow-hidden bg-surface-secondary">
      <div
        class={[
          "fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity",
          sidebarOpen.value ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick$={() => (sidebarOpen.value = false)}
      />

      <div
        class={[
          "fixed lg:static z-40 h-full transition-transform duration-300 lg:translate-x-0",
          sidebarOpen.value ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar />
      </div>

      <div class="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle$={() => (sidebarOpen.value = !sidebarOpen.value)} />
        <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Slot />
        </main>
      </div>
    </div>
  );
});
