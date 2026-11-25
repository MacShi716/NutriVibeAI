import { spawn } from "node:child_process";
import { access, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(appRoot, "app", "api");
const holdDir = path.join(os.tmpdir(), `nutrivibe-api-${process.pid}`);

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function restoreApi() {
  if (!(await exists(holdDir))) return;
  if (await exists(apiDir)) {
    throw new Error("Refusing to restore app/api because both the source and the temporary copy exist.");
  }
  await rename(holdDir, apiDir);
}

async function runBuild() {
  const nextBin = path.join(appRoot, "node_modules", "next", "dist", "bin", "next");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextBin, "build"], {
      cwd: appRoot,
      stdio: "inherit",
      env: { ...process.env, GITHUB_PAGES: "true", NEXT_PUBLIC_STATIC_HOST: "true" },
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  if (!(await exists(apiDir))) {
    throw new Error("app/api is missing. Restore the API routes before a static export.");
  }
  await rename(apiDir, holdDir);
  let code = 1;
  try {
    code = await runBuild();
    if (code === 0) {
      await writeFile(path.join(appRoot, "out", ".nojekyll"), "");
    }
  } finally {
    await restoreApi();
  }
  process.exitCode = code;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
