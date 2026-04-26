export const ANY_WORKER = "any";

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function todayInBelgrade() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));

  return next.toISOString().slice(0, 10);
}

export function formatDateShort(date: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatDateLong(date: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatPrice(price: number | null) {
  if (price === null) {
    return "Cena po dogovoru";
  }

  return `${price.toLocaleString("sr-Latn-RS")} RSD`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`;
}

type StepParams = {
  worker?: string;
  service?: string;
  date?: string;
  slot?: string;
};

export function buildBookingUrl(slug: string, params: StepParams) {
  const search = new URLSearchParams();

  if (params.worker) search.set("worker", params.worker);
  if (params.service) search.set("service", params.service);
  if (params.date) search.set("date", params.date);
  if (params.slot) search.set("slot", params.slot);

  const query = search.toString();
  return query ? `/${slug}/book?${query}` : `/${slug}/book`;
}
