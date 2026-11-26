"use client";

import { useState } from "react";
import { useUi } from "@/components/UiProvider";
import { localizeMessage } from "@/i18n/text";
import { ko } from "@/i18n/messages/ko";

export default function IngredientAdder({
  onAdd,
}: {
  onAdd: (name: string, amount: string) => void;
}) {
  const { t } = useUi();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [ask, setAsk] = useState(false);

  function submit(withAmount: string, allowEmpty: boolean) {
    const nextName = name.trim();
    if (!nextName) {
      setError(ko.errors.ingredientNeedName);
      setAsk(false);
      return;
    }
    const nextAmount = withAmount.trim();
    if (!nextAmount && !allowEmpty) {
      setAsk(true);
      setError(ko.errors.ingredientNeedAmount);
      return;
    }
    onAdd(nextName, nextAmount);
    setName("");
    setAmount("");
    setError("");
    setAsk(false);
  }

  return (
    <div className="nv-inset mt-2 p-3" data-testid="ingredient-adder">
      <p className="text-xs font-medium text-gray-700">{t.ingredient.title}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
        <label className="text-[11px] text-gray-500">
          {t.ingredient.name}
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder={t.ingredient.namePlaceholder}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800"
          />
        </label>
        <label className="text-[11px] text-gray-500">
          {t.ingredient.amount}
          <input
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            placeholder={t.ingredient.amountPlaceholder}
            data-testid="ingredient-amount"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800"
          />
        </label>
        <button
          type="button"
          onClick={() => submit(amount, false)}
          className="nv-btn self-end rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
        >
          {t.ingredient.add}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{localizeMessage(error, t)}</p>}
      {ask && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => submit(amount, false)}
            className="nv-btn rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
          >
            {t.ingredient.addWithAmount}
          </button>
          <button
            type="button"
            onClick={() => submit("", true)}
            className="nv-btn-secondary rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            {t.ingredient.addNameOnly}
          </button>
          <button
            type="button"
            onClick={() => {
              setAsk(false);
              setError("");
            }}
            className="nv-btn-secondary rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            {t.common.cancel}
          </button>
        </div>
      )}
    </div>
  );
}
