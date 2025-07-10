<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";

  const { children } = $props();
</script>

<ModeWatcher />
<div class="p-4">
  {@render children()}
</div>
