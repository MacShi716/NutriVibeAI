"use client";

import { useState } from "react";

export default function IngredientAdder({
  onAdd,
}: {
  onAdd: (name: string, amount: string) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [ask, setAsk] = useState(false);

  function submit(withAmount: string, allowEmpty: boolean) {
    const nextName = name.trim();
    if (!nextName) {
      setError("식재료 이름을 입력해 주세요.");
      setAsk(false);
      return;
    }
    const nextAmount = withAmount.trim();
    if (!nextAmount && !allowEmpty) {
      setAsk(true);
      setError("양을 입력해 주세요. 임의로 정하지 않습니다.");
      return;
    }
    onAdd(nextName, nextAmount);
    setName("");
    setAmount("");
    setError("");
    setAsk(false);
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3" data-testid="ingredient-adder">
      <p className="text-xs font-medium text-gray-700">식재료 한 가지 추가</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
        <label className="text-[11px] text-gray-500">
          이름
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="예: 달걀"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800"
          />
        </label>
        <label className="text-[11px] text-gray-500">
          양
          <input
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            placeholder="예: 200g, 2개"
            data-testid="ingredient-amount"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800"
          />
        </label>
        <button
          type="button"
          onClick={() => submit(amount, false)}
          className="self-end rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
        >
          추가
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {ask && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => submit(amount, false)}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
          >
            양을 넣고 추가
          </button>
          <button
            type="button"
            onClick={() => submit("", true)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            이름만 추가
          </button>
          <button
            type="button"
            onClick={() => {
              setAsk(false);
              setError("");
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
