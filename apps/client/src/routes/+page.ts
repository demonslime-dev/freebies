import { PUBLIC_API_BASE_URL } from "$env/static/public";
import { formSchema } from "$lib/custom/schema";
import type { ApiResponse } from "$lib/custom/types";
import { isRedirect, redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const code = localStorage.getItem("code");

  if (code) {
    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/coupons/${code}`);
      const result: ApiResponse = await response.json();

      if (result.status === "fail") {
        localStorage.removeItem("code");
        throw redirect(300, "/coupon");
      }

      return { code, form: await superValidate(result.data, zod(formSchema)) };
    } catch (error) {
      if (isRedirect(error)) throw error;
      console.log(error);
    }
  }

  throw redirect(300, "/coupon");
};
