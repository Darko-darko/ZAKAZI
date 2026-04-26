export function normalizeProviderSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u0111\u0452]/g, "dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function createProviderSlug(value: string) {
  return normalizeProviderSlug(value) || "moj-nalog";
}
