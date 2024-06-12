declare global {
    namespace PrismaJson {
        interface StorageState {
            cookies: Array<{
                name: string;
                value: string;
                domain: string;
                path: string;
                expires: number;
                httpOnly: boolean;
                secure: boolean;
                sameSite: 'Strict' | 'Lax' | 'None';
            }>;

            origins: Array<{
                origin: string;
                localStorage: Array<{ name: string; value: string; }>;
            }>;
        }
    }
}

export {};
