<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import type { LayoutProps } from "./$types";

  const { children }: LayoutProps = $props();
</script>

<ModeWatcher />
<div class="p-4">
  {@render children()}
</div>
