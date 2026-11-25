import { Suspense } from "react";
import LoadingLine from "@/components/LoadingLine";
import RecipeDetailPage from "./RecipeDetail";

export default function RecipeViewPage() {
  return (
    <Suspense fallback={<LoadingLine />}>
      <RecipeDetailPage />
    </Suspense>
  );
}
