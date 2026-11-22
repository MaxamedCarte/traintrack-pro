import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  get mongoUri() {
    return required("MONGODB_URI");
  },
  get authSecret() {
    const secret = required("AUTH_SECRET");
    if (secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters long");
    return secret;
  },
  get adminEmail() {
    return process.env.ADMIN_EMAIL?.trim().toLowerCase() || "";
  },
  get adminPassword() {
    return process.env.ADMIN_PASSWORD || "";
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  },
};
