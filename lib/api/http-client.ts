/**
 * HTTP client for the real TideRent backend (owned by the backend developer).
 *
 * Authentication is injected, not implemented here: pass the authenticated
 * fetch provided by the TideCloak integration (which attaches the access token
 * and DPoP proof). This file deliberately makes no TideCloak SDK calls.
 *
 * Agreed endpoints (see docs/frontend-api-contract.md):
 *   GET  /api/bonds
 *   GET  /api/bonds/:id
 *   POST /api/bonds/:id/proposals
 *   POST /api/bonds/:id/approvals
 *   POST /api/bonds/:id/disputes
 *   POST /api/bonds/:id/releases
 */
import {
  type ApiError,
  BondApiError,
  type BondApi,
  type BondCase,
  type BondSummary,
} from "./types";

export type AuthenticatedFetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Backend error codes (docs/API_CONTRACT.md) mapped to the UI's error codes. */
const backendErrorCodes: Record<string, ApiError["code"]> = {
  UNAUTHORIZED: "unauthenticated",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not-found",
  PAYLOAD_MISMATCH: "stale-version",
  STALE_VERSION: "stale-version",
  INVALID_INPUT: "invalid-input",
  APPROVAL_QUORUM_INCOMPLETE: "invalid-state",
  DUPLICATE_APPROVAL: "invalid-state",
  TRANSACTION_REPLAY: "invalid-state",
  RELEASE_ALREADY_EXISTS: "invalid-state",
  DISPUTE_OPEN: "invalid-state",
};

function statusToCode(status: number): ApiError["code"] {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 400) return "invalid-input";
  return "invalid-state";
}

export function createHttpBondApi(fetcher: AuthenticatedFetch, baseUrl = "/api"): BondApi {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const raw = typeof body?.error === "string" ? body.error : typeof body?.code === "string" ? body.code : "";
      const code = backendErrorCodes[raw] ?? statusToCode(res.status);
      const message = typeof body?.message === "string" ? body.message : `Request failed (${res.status}).`;
      throw new BondApiError({ code, message });
    }
    // Accept both `{ data: T }` (ApiResponse wrapper) and a bare `T`.
    return (body && "data" in body ? body.data : body) as T;
  }

  const post = <T,>(path: string, body: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body) });
  const bondPath = (bondId: string) => `/bonds/${encodeURIComponent(bondId)}`;

  return {
    mode: "http",
    listMyBonds: () => call<BondSummary[]>("/bonds"),
    getBondCase: (bondId) => call<BondCase>(bondPath(bondId)),
    proposeTerms: (bondId, input) => post<BondCase>(`${bondPath(bondId)}/proposals`, input),
    approve: (bondId, input) => post<BondCase>(`${bondPath(bondId)}/approvals`, input),
    raiseDispute: (bondId, input) => post<BondCase>(`${bondPath(bondId)}/disputes`, input),
    requestRelease: (bondId, input) => post<BondCase>(`${bondPath(bondId)}/releases`, input),
  };
}
