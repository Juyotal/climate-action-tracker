// Typed fetch wrappers for /api/v1/ routes.
// All functions throw on non-OK responses.

export type City = {
  id: number;
  name: string;
  baseline_tons: number;
  baseline_year: number;
  target_year: number;
};

export type ClimateAction = {
  id: number;
  cityId: number;
  title: string;
  sector: "transport" | "energy" | "buildings" | "waste" | "land_use";
  status: "planned" | "in_progress" | "completed";
  annual_reduction: number;
  start_year: number;
  source: "manual" | "ai";
  confidence: number | null;
  createdAt: string;
};

export type ExtractedAction = {
  title: string;
  sector: "transport" | "energy" | "buildings" | "waste" | "land_use";
  status: "planned" | "in_progress" | "completed";
  annual_reduction: number;
  start_year: number;
  confidence: number;
};

export type ExtractResult = {
  extracted: ExtractedAction[];
  skipped: { reason: string; raw: unknown }[];
  stopReason?: string;
};

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${init?.method ?? "GET"} ${url} → ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function listCities(): Promise<City[]> {
  return apiFetch<City[]>("/api/v1/cities");
}

export function getCity(id: number): Promise<City> {
  return apiFetch<City>(`/api/v1/cities/${id}`);
}

export function updateCity(id: number, data: Partial<Omit<City, "id" | "name">>): Promise<City> {
  return apiFetch<City>(`/api/v1/cities/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function listActions(cityId?: number): Promise<ClimateAction[]> {
  const url = cityId ? `/api/v1/actions?cityId=${cityId}` : "/api/v1/actions";
  return apiFetch<ClimateAction[]>(url);
}

export function createAction(
  data: Omit<ClimateAction, "id" | "createdAt">
): Promise<ClimateAction> {
  return apiFetch<ClimateAction>("/api/v1/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateAction(
  id: number,
  data: Partial<Omit<ClimateAction, "id" | "cityId" | "createdAt">>
): Promise<ClimateAction> {
  return apiFetch<ClimateAction>(`/api/v1/actions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteAction(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/actions/${id}`, { method: "DELETE" });
}

export function bulkCreate(
  cityId: number,
  actions: ExtractedAction[]
): Promise<{ created: ClimateAction[] }> {
  return apiFetch<{ created: ClimateAction[] }>("/api/v1/actions/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cityId, actions }),
  });
}

export function extractActions(text: string, cityId: number): Promise<ExtractResult> {
  return apiFetch<ExtractResult>("/api/v1/actions/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, cityId }),
  });
}
