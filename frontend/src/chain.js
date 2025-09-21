// frontend/src/chain.js
import { api } from "./api";
let cached = null;

export async function getChain() {
  if (cached) return cached;
  try {
    cached = await api("/api/chain");
  } catch {
    cached = { explorer: "" };
  }
  return cached;
}
