const isDev = process.env.NODE_ENV !== "production";

export const logger = isDev
  ? console
  : {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
    };
