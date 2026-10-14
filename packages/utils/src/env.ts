import { z } from "zod";

const envSchema = z.object({
  MAIL_AUTH_USER: z.email(),
  MAIL_AUTH_PASS: z.string(),
});

export const env = envSchema.parse(process.env);
