import { createLogger, format, transports } from "winston";

// Create the logger
export const logger = createLogger({
  level: "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.colorize(),
    format.printf(({ level, message, timestamp, stack }) => {
      return stack
        ? `${timestamp} [${level}] ${message}\n${stack}` // Prettifies error stack
        : `${timestamp} [${level}] ${message}`;
    })
  ),
  transports: [new transports.Console()],
});
