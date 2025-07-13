import { PUBLIC_API_BASE_URL } from "$env/static/public";
import type { ApiResponse } from "$lib/custom/types";
import { redirect } from "@sveltejs/kit";
import type { PageLoadEvent } from "./$types";

export async function load({ fetch }: PageLoadEvent) {
  const code = localStorage.getItem("code");

  if (code) {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/coupons/${code}`);
    const result: ApiResponse = await response.json();

    if (result.status === "success") {
      throw redirect(307, "/");
    }
  }
}
