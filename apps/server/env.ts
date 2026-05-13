import { z } from "zod";

const envSchema = z.object({
  PORT: z.number().default(8000),
});

export const env = envSchema.parse(Deno.env.toObject());
