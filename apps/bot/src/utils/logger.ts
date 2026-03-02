import pino from "pino";

export const logger = pino({
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  redact: {
    paths: [
      "password",
      "username",
      "taxisnetPassword",
      "taxisnetUsername",
      "credentials.*",
      "smtpPassword",
    ],
    censor: "[REDACTED]",
  },
});
