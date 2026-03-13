const requiredEnvVars = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
} as const;

const optionalEnvVars = {
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Please add ${key} to your .env.local file.`,
    );
  }
});

export const env = {
  ...requiredEnvVars,
  ...optionalEnvVars,
  API_URL: requiredEnvVars.NEXT_PUBLIC_API_URL!,
  isDevelopment: optionalEnvVars.NODE_ENV === "development",
  isProduction: optionalEnvVars.NODE_ENV === "production",
  isTest: optionalEnvVars.NODE_ENV === "test",
} as const;

export type Env = typeof env;
