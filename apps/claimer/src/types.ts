import type { SourceType } from "@freebies/db/types";
import type { BrowserContext, Page } from "patchright";

export interface UserCredentials {
  email: string;
  password: string;
  authSecret: string | null;
}

export interface Claimer {
  sourceType: SourceType;
  isAuthenticated(page: Page): Promise<boolean>;
  isAuthenticated(context: BrowserContext): Promise<boolean>;
  authenticate(user: UserCredentials, context: BrowserContext): Promise<void>;
  claim(url: string, context: BrowserContext, authSecret?: string | null): Promise<void>;
}
