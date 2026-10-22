/**
 * HTTP client for the real TideRent backend (owned by the backend developer).
 *
 * Authentication is injected, not implemented here: pass the authenticated
 * fetch provided by the TideCloak integration (which attaches the access token
 * and DPoP proof). This file deliberately makes no TideCloak SDK calls.
 *
 * Endpoints are listed in docs/frontend-api-contract.md.
 */
import {
  type ApiError,
  BondApiError,
  type BondApi,
  type BondCase,
  type BondSummary,
} from "./types";

export type AuthenticatedFetch = (input: string, init?: RequestInit) => Promise<Response>;

export function createHttpBondApi(fetcher: AuthenticatedFetch, baseUrl = "/api"): BondApi {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiError | null;
      throw new BondApiError(body ?? { code: res.status === 401 ? "unauthenticated" : res.status === 403 ? "forbidden" : "invalid-state", message: `Request failed (${res.status}).` });
    }
    return (await res.json()) as T;
  }

  const post = <T,>(path: string, body: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body) });
  const bondPath = (bondId: string) => `/bonds/${encodeURIComponent(bondId)}`;

  return {
    mode: "http",
    listMyBonds: () => call<BondSummary[]>("/bonds"),
    getBondCase: (bondId) => call<BondCase>(bondPath(bondId)),
    createRefundRequest: (bondId, input) => post<BondCase>(`${bondPath(bondId)}/refund-request`, input),
    proposeTerms: (bondId, input) => post<BondCase>(`${bondPath(bondId)}/proposals`, input),
    approve: (bondId, input) => post<BondCase>(`${bondPath(bondId)}/approvals`, input),
    raiseDispute: (bondId, input) => post<BondCase>(`${bondPath(bondId)}/disputes`, input),
  };
}
