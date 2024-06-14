declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DIRECT_URL: string;
            DATABASE_URL: string;
            PROXY_SERVER: string;
            MAIL_AUTH_USER: string;
            MAIL_AUTH_PASS: string;
        }
    }
}

export {};
