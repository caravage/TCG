/** Card backs: the opening of each Wikipedia article, loaded once on first use. */
let pending: Promise<Record<string, string>> | null = null;

export function loadExtracts(): Promise<Record<string, string>> {
  pending ??= fetch(`${import.meta.env.BASE_URL}extracts.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return pending;
}
