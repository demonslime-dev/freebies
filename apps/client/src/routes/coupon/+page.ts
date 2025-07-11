import { goto } from "$app/navigation";
import { PUBLIC_API_BASE_URL } from "$env/static/public";
import type { ApiResponse } from "$lib/custom/types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const code = localStorage.getItem("code");

  if (code) {
    const response = await fetch(`${PUBLIC_API_BASE_URL}/coupons/${code}`);
    const result: ApiResponse = await response.json();

    if (result.status === "success") {
      // throw redirect(300, "/");
      return await goto("/");
    }
  }
};
