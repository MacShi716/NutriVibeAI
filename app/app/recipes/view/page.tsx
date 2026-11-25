import { Suspense } from "react";
import RecipeDetailPage from "./RecipeDetail";

export default function RecipeViewPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl text-center text-sm text-gray-500">불러오는 중입니다.</div>
      }
    >
      <RecipeDetailPage />
    </Suspense>
  );
}
