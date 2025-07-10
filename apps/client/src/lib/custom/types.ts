type FailResponse = {
  status: "fail";
  message: string;
};

type SuccessResponse = {
  status: "success";
  data?: {
    name: string;
    email: string;
    password: string;
    authSecrets: {
      Fab?: string;
      Unity?: string;
      Itch?: string;
    };
  };
};

export type ApiResponse = FailResponse | SuccessResponse;
