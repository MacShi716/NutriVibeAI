import { en } from "./messages/en";
import { ko } from "./messages/ko";
import { zh } from "./messages/zh";
import type { Messages } from "./messages/types";
import type { Locale } from "./locale";

export const CATALOG: Record<Locale, Messages> = {
  ko,
  zh,
  en,
};

export function messagesFor(locale: Locale): Messages {
  switch (locale) {
    case "ko":
      return ko;
    case "zh":
      return zh;
    case "en":
      return en;
    default: {
      const never: never = locale;
      return never;
    }
  }
}
