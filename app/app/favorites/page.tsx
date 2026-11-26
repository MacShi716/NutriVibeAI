"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUi } from "@/components/UiProvider";
import { dateLocale } from "@/i18n/locale";
import { format, localizeMessage } from "@/i18n/text";
import { ko } from "@/i18n/messages/ko";
import { requestRecipes } from "@/lib/client-api";
import { storage } from "@/lib/storage";
import type { HistoryEntry } from "@/lib/storage";
import type { Recipe, UserConditions } from "@/lib/types";

export default function FavoritesPage() {
  const router = useRouter();
  const { t, locale } = useUi();
  const [favs, setFavs] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setFavs(storage.getFavorites());
    setHistory(storage.getHistory());
  }, []);

  function removeFav(id: string) {
    const recipe = favs.find((r) => r.id === id);
    if (!recipe) return;
    storage.toggleFavorite(recipe);
    setFavs(storage.getFavorites());
  }

  async function regenerate(idx: number, conditions?: UserConditions | null) {
    if (!conditions || regeneratingId !== null) return;
    setRegeneratingId(idx);
    setError("");
    try {
      const outcome = await requestRecipes(conditions);
      if (!outcome.ok) throw new Error(outcome.error);
      storage.saveLastResult(outcome.result);
      router.push("/recipes");
    } catch {
      setError(ko.errors.regenerateFailed);
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">{t.favorites.title}</h1>
      {error && <p className="nv-error mt-3">{localizeMessage(error, t)}</p>}

      <h2 className="mb-3 mt-6 text-base font-bold text-gray-900">{t.favorites.favHeading}</h2>
      {favs.length === 0 ? (
        <div className="nv-card nv-empty p-6 text-sm text-gray-500">
          {t.favorites.favEmpty}
        </div>
      ) : (
        <ul className="nv-stagger space-y-2">
          {favs.map((r) => (
            <li
              key={r.id}
              className="nv-card nv-card-hover nv-card--compact flex items-center justify-between px-4 py-3"
            >
              <div>
                <Link
                  href={`/recipes/view?id=${encodeURIComponent(r.id)}`}
                  className="font-semibold text-gray-900 hover:text-brand-700"
                >
                  {r.title}
                </Link>
                <p className="text-xs text-gray-500">
                  {format(t.favorites.meta, { minutes: r.cookMinutes, servings: r.servings, count: r.ingredients.length })}
                </p>
              </div>
              <button
                onClick={() => removeFav(r.id)}
                className="nv-btn-secondary rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                {t.common.remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-8 text-base font-bold text-gray-900">{t.favorites.history}</h2>
      {history.length === 0 ? (
        <div className="nv-card nv-empty p-6 text-sm text-gray-500">
          {t.favorites.historyEmpty}
        </div>
      ) : (
        <ul className="nv-stagger space-y-2">
          {history.map((h, i) => (
            <li key={i} className="nv-card nv-card-hover nv-card--compact flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{h.title}</p>
                <p className="text-xs text-gray-500">
                  {format(t.favorites.historyMeta, { count: h.recipeCount })} ·{" "}
                  {new Date(h.generatedAt).toLocaleString(dateLocale(locale))}
                  {h.usedMock ? ` · ${t.favorites.demo}` : ""}
                </p>
                {h.conditions && (
                  <p className="mt-1 text-xs text-gray-400">
                    {format(t.favorites.conditions, {
                      ingredients: h.conditions.ingredients || "—",
                      servings: h.conditions.servings,
                      minutes: h.conditions.cookMinutes,
                    })}
                    {h.conditions.goalCalories ? ` · ${format(t.favorites.goal, { n: h.conditions.goalCalories })}` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {h.conditions && (
                  <button
                    onClick={() => regenerate(i, h.conditions)}
                    disabled={regeneratingId !== null}
                    className="nv-btn-secondary rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                  >
                    {regeneratingId === i ? t.favorites.generating : t.favorites.regenerate}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
