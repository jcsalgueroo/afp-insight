#!/usr/bin/env bun
/**
 * Fetches the latest Google Sheets CSVs, normalizes them, and writes the
 * result to src/data/snapshot.json so the app can run fully offline / on
 * networks that block docs.google.com.
 *
 * Run: bun scripts/refresh-snapshot.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Papa from "papaparse";
import {
  DISPLACEMENT_URL,
  MASTER_URL,
  normalizeDisplacement,
  normalizeMaster,
} from "../src/lib/data-normalize";

type Raw = Record<string, string>;

async function fetchCsv(url: string): Promise<Raw[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch CSV (${res.status})`);
  const text = await res.text();
  const parsed = Papa.parse<Raw>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return parsed.data;
}

async function main() {
  console.log("Fetching master sheet…");
  const masterRaw = await fetchCsv(MASTER_URL);
  console.log(`  ${masterRaw.length} raw rows`);
  console.log("Fetching displacement sheet…");
  const dispRaw = await fetchCsv(DISPLACEMENT_URL);
  console.log(`  ${dispRaw.length} raw rows`);

  const master = normalizeMaster(masterRaw);
  const displacement = normalizeDisplacement(dispRaw);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    master,
    displacement,
  };

  const outPath = resolve(import.meta.dir, "..", "src/data/snapshot.json");
  writeFileSync(outPath, JSON.stringify(snapshot));
  const sizeMb = (JSON.stringify(snapshot).length / 1024 / 1024).toFixed(2);
  console.log(
    `Wrote ${outPath} — ${master.length} master rows, ${displacement.length} displacement rows (${sizeMb} MB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});