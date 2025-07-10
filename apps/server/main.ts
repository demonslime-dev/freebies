import { db } from "@freebies/db";
import type { ProductType } from "@freebies/db/types";
// import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Hono } from "hono/tiny";
import type { ApiResponse, Data } from "./types.ts";
import { createOrUpdateAuthState, createOrUpdateUser, updateCoupon } from "./utils.ts";

const port = Number(Deno.env.get("PORT") ?? "8000");
const app = new Hono();

app.use(logger());
app.use(cors());

app.get("/", (ctx) => ctx.text("Hello Hono!"));

app.get("/coupons/:code", async (ctx) => {
  const code = ctx.req.param("code");

  const coupon = await db.query.coupon.findFirst({
    where: { code },
    with: {
      user: {
        with: {
          authStates: { columns: { productType: true, authSecret: true } },
        },
      },
    },
  });

  if (!coupon) {
    return ctx.json<ApiResponse>({
      status: "fail",
      message: "Invalid coupon",
    });
  }

  const user = coupon.user;
  if (!user) {
    return ctx.json<ApiResponse>({
      status: "success",
    });
  }

  const getAuthSecret = (productType: string) => {
    const product = user.authStates.find((p) => p.productType === productType);
    const authSecret = product?.authSecret;
    return authSecret ?? undefined;
  };

  return ctx.json<ApiResponse>({
    status: "success",
    data: {
      name: user.name,
      email: user.email,
      password: user.password,
      authSecrets: {
        Fab: getAuthSecret("Fab"),
        Unity: getAuthSecret("Unity"),
        Itch: getAuthSecret("Itch"),
      },
    },
  });
});

app.post("/coupons/:code", async (ctx) => {
  const { authSecrets, ...userData } = await ctx.req.json<Data>();

  const code = ctx.req.param("code");
  const coupon = await db.query.coupon.findFirst({ where: { code } });

  if (!coupon) {
    return ctx.json<ApiResponse>({
      status: "fail",
      message: "Invalid coupon",
    });
  }

  try {
    const userId = await createOrUpdateUser(coupon.userId, userData);

    for (const key in authSecrets) {
      const authSecret = authSecrets[key as ProductType];
      await createOrUpdateAuthState(userId, key as ProductType, authSecret);
    }

    await updateCoupon(coupon.id, userId);
    return ctx.json<ApiResponse>({
      status: "success",
    });
  } catch (error) {
    console.error(error);
    return ctx.json<ApiResponse>({
      status: "fail",
      message: "Something went wrong",
    });
  }
});

// serve({ fetch: app.fetch, port }, (info) => {
//   console.log(`Server is running on http://localhost:${info.port}`);
// });

Deno.serve({ port }, app.fetch);
