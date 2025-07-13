<script lang="ts">
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { formSchema } from "$lib/custom/schema";
  import { superForm } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { PUBLIC_API_BASE_URL } from "$env/static/public";
  import type { ApiResponse } from "$lib/custom/types";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

  const form = superForm(data.form, {
    validators: zodClient(formSchema),
    dataType: "json",
    resetForm: false,
    SPA: true,
    async onUpdate({ form }) {
      if (!form.valid) return;

      try {
        const response = await fetch(`${PUBLIC_API_BASE_URL}/coupons/${data.code}`, {
          method: "POST",
          body: JSON.stringify(form.data),
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result: ApiResponse = await response.json();

        if (result.status === "success") {
          alert("Success");
        } else {
          alert("Fail");
        }
      } catch (error) {
        alert("Something went wrong,\nplease check your internet connection");
      }
    },
  });

  const { form: formData, submitting, enhance } = form;
</script>

<form method="POST" use:enhance class="space-y-4">
  <Form.Field {form} name="name">
    <Form.Control>
      {#snippet children({ props })}
        <Input {...props} bind:value={$formData.name} placeholder="Name" type="text" />
      {/snippet}
    </Form.Control>
    <Form.Description />
    <Form.FieldErrors />
  </Form.Field>
  <Form.Field {form} name="email">
    <Form.Control>
      {#snippet children({ props })}
        <Input {...props} bind:value={$formData.email} placeholder="Email" type="email" />
      {/snippet}
    </Form.Control>
    <Form.Description />
    <Form.FieldErrors />
  </Form.Field>
  <Form.Field {form} name="password">
    <Form.Control>
      {#snippet children({ props })}
        <Input {...props} bind:value={$formData.password} placeholder="Password" type="password" />
      {/snippet}
    </Form.Control>
    <Form.Description />
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="authSecrets.Unity">
    <Form.Control>
      {#snippet children({ props })}
        <Input {...props} bind:value={$formData.authSecrets.Unity} placeholder="Auth Secret (Unity)" type="text" />
      {/snippet}
    </Form.Control>
    <Form.Description />
    <Form.FieldErrors />
  </Form.Field>
  <Form.Field {form} name="authSecrets.Itch">
    <Form.Control>
      {#snippet children({ props })}
        <Input {...props} bind:value={$formData.authSecrets.Itch} placeholder="Auth Secret (Itch)" type="text" />
      {/snippet}
    </Form.Control>
    <Form.Description />
    <Form.FieldErrors />
  </Form.Field>
  <Form.Field {form} name="authSecrets.Fab">
    <Form.Control>
      {#snippet children({ props })}
        <Input {...props} bind:value={$formData.authSecrets.Fab} placeholder="Auth Secret (Fab)" type="text" />
      {/snippet}
    </Form.Control>
    <Form.Description />
    <Form.FieldErrors />
  </Form.Field>
  <Form.Button class="w-full" disabled={$submitting}>Save</Form.Button>
</form>
