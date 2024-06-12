declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DIRECT_URL: string;
            DATABASE_URL: string;
            MAIL_AUTH_USER: string;
            MAIL_AUTH_PASS: string;
        }
    }
}

export {};
