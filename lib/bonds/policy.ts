import type { ReleaseAuthorizationEvidence } from "../../shared/api-contracts";

export interface BondReleasePolicyInput {
  bondId: string;
  recipient: string;
  amountInCents: number;
  agreementVersion: string;
  transactionId: string;
  payloadHash: string;
  renterApproverId: string;
  landlordApproverId: string;
}

export interface BondReleasePolicyAdapter {
  authorize(input: BondReleasePolicyInput): Promise<ReleaseAuthorizationEvidence>;
}

/**
 * Local demo adapter. It re-checks the request shape but does not create a
 * Tide/Forseti signature and cannot move money. The response is deliberately
 * labelled simulation so it cannot be mistaken for policy enforcement.
 */
export class SimulatedForsetiPolicyAdapter implements BondReleasePolicyAdapter {
  async authorize(input: BondReleasePolicyInput): Promise<ReleaseAuthorizationEvidence> {
    if (!input.payloadHash || !input.transactionId || !input.renterApproverId || !input.landlordApproverId) {
      throw new Error("Simulated policy received incomplete release evidence");
    }

    return {
      mode: "simulation",
      policyId: "tiderent-bond-release-simulator",
      verifiedAt: new Date().toISOString(),
    };
  }
}

export const bondReleasePolicy: BondReleasePolicyAdapter = new SimulatedForsetiPolicyAdapter();
