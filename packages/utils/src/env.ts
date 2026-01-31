import "@std/dotenv/load";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  MAIL_AUTH_USER: z.email(),
  MAIL_AUTH_PASS: z.string(),
});

export default envSchema.parse(Deno.env.toObject());
