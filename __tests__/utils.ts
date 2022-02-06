import pino, { Logger } from "pino";

export const omit = <A, P extends keyof A>(prop: P, a: A): Omit<A, P> => {
  const { [prop]: _, ...toReturn } = a;
  return toReturn;
};

export const noopLogger: Logger = pino({ enabled: false });
