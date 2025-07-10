import type { ProductType } from "@freebies/db/types";

type FailResponse = {
  status: "fail";
  message: string;
};

type SuccessResponse = {
  status: "success";
  data?: Data;
};

export type Data = {
  name: string;
  email: string;
  password: string;
  authSecrets: { [key in ProductType]?: string };
};

export type ApiResponse = FailResponse | SuccessResponse;
