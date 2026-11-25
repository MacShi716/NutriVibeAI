import type { ko } from "./ko";

type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

/** Same keys in every locale. Leaves are strings so translations can differ. */
export type Messages = Widen<typeof ko>;
