<script lang="ts">
  import { PUBLIC_API_BASE_URL } from "$env/static/public";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { couponSchema } from "$lib/custom/schema";
  import type { ApiResponse } from "$lib/custom/types";
  import { defaults, setError, superForm } from "sveltekit-superforms";
  import { zod, zodClient } from "sveltekit-superforms/adapters";
  import { goto } from "$app/navigation";

  const form = superForm(defaults(zod(couponSchema)), {
    validators: zodClient(couponSchema),
    SPA: true,
    async onUpdate({ form }) {
      if (!form.valid) return;

      try {
        const response = await fetch(`${PUBLIC_API_BASE_URL}/coupons/${form.data.code}`);

        const result: ApiResponse = await response.json();

        if (result.status === "success") {
          localStorage.setItem("code", form.data.code);
          return await goto("/", { replaceState: true });
        } else {
          localStorage.removeItem("code");
          setError(form, "code", result.message);
        }
      } catch (error) {
        localStorage.removeItem("code");
        alert("Something went wrong, please check your internet connection");
      }
    },
  });

  const { form: formData, submitting, enhance } = form;
</script>

<form method="POST" use:enhance class="space-y-4">
  <Form.Field {form} name="code">
    <Form.Control>
      {#snippet children({ props })}
        <Input {...props} bind:value={$formData.code} placeholder="Code" type="text" />
      {/snippet}
    </Form.Control>
    <Form.Description />
    <Form.FieldErrors />
  </Form.Field>
  <Form.Button class="w-full" disabled={$submitting}>Apply</Form.Button>
</form>
