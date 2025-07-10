<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import Button from "$lib/components/ui/button/button.svelte";

  let loading = $state(false);

  async function reload() {
    loading = true;
    await invalidateAll();
    loading = false;
  }
</script>

<div class="p-4 h-screen flex flex-col justify-center">
  <div class="text-center">Something went wrong, <br /> Please check your internet connection</div>
  <Button onclick={reload} disabled={loading} class="mt-2 self-center">Reload</Button>
</div>
