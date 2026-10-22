import { createMockBondApi } from "./mock-client";
import type { BondApi, PartyRole } from "./types";

export * from "./types";

/**
 * Returns the API used by the rental UI.
 *
 * Today this is always the in-browser simulator. When the backend routes and
 * TideCloak session are ready, switch to `createHttpBondApi(authenticatedFetch)`
 * from ./http-client. In HTTP mode the role comes from the verified token, so
 * the `demoRole` argument is only used by the simulator.
 */
export function getBondApi(demoRole: PartyRole): BondApi {
  return createMockBondApi(demoRole);
}
