declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      MAIL_AUTH_USER: string;
      MAIL_AUTH_PASS: string;
    }
  }
}

export {};
