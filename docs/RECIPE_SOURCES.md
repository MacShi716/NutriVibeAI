# Built-in recipe library sources

NutriVibeAI ships a compact, language-specific built-in recipe library for demo mode (when the Zhipu relay is not configured or fails). The three sets are not translations of the same dishes. Recipe text stays in the active UI language; the app does not fall back to Korean titles on a Chinese or English screen.

| Language | Count | Source | License |
| --- | ---: | --- | --- |
| Korean (`ko`) | 71 | Existing NutriVibeAI home-cooking templates in `app/lib/mock.ts` | Original to this project; matching rules in `mock.ts` are unchanged |
| Chinese (`zh`) | 57 | [Anduin2017/HowToCook](https://github.com/Anduin2017/HowToCook) (curated subset of everyday home dishes, including 酱拌荞麦面) | [Unlicense](https://github.com/Anduin2017/HowToCook/blob/master/LICENSE) (public domain) |
| English (`en`) | 50 | Government recipes collected in [micahcochran/json-cookbook](https://github.com/micahcochran/json-cookbook) (`cookbook-100.json`), from USDA MyPlate / SNAP-Ed, NHLBI, and NIH/NLM MedlinePlus | U.S. government works, public domain. See [USDA policies](https://www.usda.gov/policies-and-links), [NHLBI legal](https://www.nhlbi.nih.gov/about/contact/trademark-branding-and-logo), and [NLM copyright](https://www.nlm.nih.gov/web_policies.html#copyright) |
| English (`en`) | 1 | [Wikibooks Cookbook: Buckwheat Ginger Banana Cake with Chocolate](https://en.wikibooks.org/wiki/Cookbook:Buckwheat_Ginger_Banana_Cake_with_Chocolate), originally posted to Foodista by Anne Pedersen | [CC BY](http://www.foodista.com/static/legal) (Foodista) / [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (Wikibooks text) |

The English total is **51** recipes. CC BY-NC entries in json-cookbook were not used. Allrecipes, Xiachufang, and other proprietary scraped datasets were not used.

Curated JSON lives in `app/data/recipes/zh.json` and `app/data/recipes/en.json`. The selection script is `scripts/curate-recipe-libraries.py`. Recipes that mention 메밀 / 荞麦 / buckwheat / soba are tagged through their ingredient names so restriction filtering still works. The 메밀 restriction chip is never pre-checked.

When adapting the CC BY-SA Wikibooks buckwheat cake, keep this attribution. The rest of the English set and the Chinese set are public domain / Unlicense.
