import { z } from "zod";

export const formSchema = z.object({
  name: z.string().trim().nonempty({ message: "Required" }),
  email: z.string().trim().email(),
  password: z.string().trim().nonempty({ message: "Required" }),
  authSecrets: z.object({
    Fab: z.string().optional(),
    Unity: z.string().optional(),
    Itch: z.string().optional(),
  }),
});

export const couponSchema = z.object({
  code: z.string().nonempty("Required"),
});
