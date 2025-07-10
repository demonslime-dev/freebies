import "@std/dotenv/load";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  MAIL_AUTH_USER: z.string().email(),
  MAIL_AUTH_PASS: z.string(),
});

export default envSchema.parse(Deno.env.toObject());
