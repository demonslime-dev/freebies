import type z from "zod";
import type { formSchema } from "./schema";

type FailResponse = {
  status: "fail";
  message: string;
};

type SuccessResponse = {
  status: "success";
  data?: Data;
};

type Data = z.infer<typeof formSchema>;

export type ApiResponse = FailResponse | SuccessResponse;
