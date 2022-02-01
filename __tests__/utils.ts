export const omit = <A, P extends keyof A>(prop: P, a: A): Omit<A, P> => {
  const { [prop]: _, ...toReturn } = a;
  return toReturn;
};
