import { PUBLIC_API_BASE_URL } from "$env/static/public";
import { formSchema } from "$lib/custom/schema";
import type { ApiResponse } from "$lib/custom/types";
import { redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { PageLoadEvent } from "./$types";

export async function load({ fetch }: PageLoadEvent) {
  const code = localStorage.getItem("code");

  if (code) {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/coupons/${code}`);
    const result: ApiResponse = await response.json();

    if (result.status === "fail") {
      localStorage.removeItem("code");
      throw redirect(307, "/coupon");
    }

    const form = await superValidate(result.data, zod(formSchema));
    return { code, form };
  }

  throw redirect(307, "/coupon");
}
