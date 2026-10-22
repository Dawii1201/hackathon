import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { DeductionInput } from "../api/types";
import { BondService, BondServiceError, resetBondStore, type BondActor } from "./service";

const renter: BondActor = { id: "renter-jordan", role: "renter" };
const landlord: BondActor = { id: "landlord-priya", role: "landlord" };
const admin: BondActor = { id: "operator-1", role: "admin" };

function proposalInput(deductions: DeductionInput[] = []) {
  return { basedOnVersion: null, deductions, note: "Test proposal" };
}

function errorCode(action: () => unknown, code: BondServiceError["code"]): void {
  assert.throws(action, (error: unknown) => error instanceof BondServiceError && error.code === code);
}

beforeEach(() => resetBondStore());

test("allows release with renter and landlord approval without third-party approval", async () => {
  const service = new BondService();
  const created = service.propose("TR-2048", renter, proposalInput());
  const payloadHash = created.settlement!.currentProposal.payloadHash;
  service.approve("TR-2048", renter, { proposalVersion: 1, payloadHash });
  const approved = service.approve("TR-2048", landlord, { proposalVersion: 1, payloadHash });
  assert.equal(approved.settlement?.status, "approved");
  assert.deepEqual(approved.settlement?.approvals.map((approval) => approval.role).sort(), ["landlord", "renter"]);

  const released = await service.release("TR-2048", landlord, { proposalVersion: 1, payloadHash });
  assert.equal(released.settlement?.release?.status, "simulated");
  assert.equal(released.settlement?.release?.authorizationMode, "simulation");
});

test("rejects release when one approval is missing", async () => {
  const service = new BondService();
  const created = service.propose("TR-2048", renter, proposalInput());
  const payloadHash = created.settlement!.currentProposal.payloadHash;
  service.approve("TR-2048", renter, { proposalVersion: 1, payloadHash });
  await assert.rejects(service.release("TR-2048", renter, { proposalVersion: 1, payloadHash }), (error: unknown) => error instanceof BondServiceError && error.code === "APPROVAL_QUORUM_INCOMPLETE");
});

test("rejects duplicate same-party approval", () => {
  const service = new BondService();
  const created = service.propose("TR-2048", renter, proposalInput());
  const payloadHash = created.settlement!.currentProposal.payloadHash;
  service.approve("TR-2048", renter, { proposalVersion: 1, payloadHash });
  errorCode(() => service.approve("TR-2048", renter, { proposalVersion: 1, payloadHash }), "DUPLICATE_APPROVAL");
});

test("rejects a changed payload after an approval", () => {
  const service = new BondService();
  const first = service.propose("TR-2048", renter, proposalInput());
  const firstHash = first.settlement!.currentProposal.payloadHash;
  service.approve("TR-2048", renter, { proposalVersion: 1, payloadHash: firstHash });
  const changed = service.propose("TR-2048", landlord, { basedOnVersion: 1, deductions: [{ category: "cleaning", description: "Changed amount", amountCents: 1000 }] });
  assert.notEqual(changed.settlement!.currentProposal.payloadHash, firstHash);
  errorCode(() => service.approve("TR-2048", landlord, { proposalVersion: 2, payloadHash: firstHash }), "PAYLOAD_MISMATCH");
});

test("rejects administrator-only release", async () => {
  const service = new BondService();
  service.propose("TR-2048", renter, proposalInput());
  await assert.rejects(service.release("TR-2048", admin, { proposalVersion: 1 }), (error: unknown) => error instanceof BondServiceError && error.code === "FORBIDDEN");
});

test("rejects an administrator approval attempt", () => {
  const service = new BondService();
  service.propose("TR-2048", renter, proposalInput());
  errorCode(() => service.approve("TR-2048", admin, { proposalVersion: 1 }), "FORBIDDEN");
});

test("rejects replayed transaction and duplicate release", async () => {
  const service = new BondService();
  const created = service.propose("TR-2048", renter, proposalInput());
  const payloadHash = created.settlement!.currentProposal.payloadHash;
  service.approve("TR-2048", renter, { proposalVersion: 1, payloadHash });
  service.approve("TR-2048", landlord, { proposalVersion: 1, payloadHash });
  await service.release("TR-2048", renter, { proposalVersion: 1, payloadHash });
  await assert.rejects(service.release("TR-2048", landlord, { proposalVersion: 1, payloadHash }), (error: unknown) => error instanceof BondServiceError && error.code === "RELEASE_ALREADY_EXISTS");
});

test("moves a disagreement into dispute state and blocks approval", () => {
  const service = new BondService();
  service.propose("TR-2048", renter, proposalInput());
  const disputed = service.dispute("TR-2048", landlord, { reason: "Damage is pre-existing", intendedPathway: "rdrv" });
  assert.equal(disputed.settlement?.status, "disputed");
  errorCode(() => service.approve("TR-2048", renter, { proposalVersion: 1 }), "DISPUTE_OPEN");
});

test("renter rejection places the settlement on hold", () => {
  const service = new BondService();
  service.propose("TR-2048", renter, proposalInput());
  const result = service.approve("TR-2048", renter, { proposalVersion: 1, decision: "rejected" });
  assert.equal(result.settlement?.status, "disputed");
  assert.equal(result.settlement?.approvals.length, 0);
});

test("landlord rejection places the settlement on hold", () => {
  const service = new BondService();
  service.propose("TR-2048", renter, proposalInput());
  const result = service.approve("TR-2048", landlord, { proposalVersion: 1, decision: "rejected" });
  assert.equal(result.settlement?.status, "disputed");
  assert.equal(result.settlement?.approvals.length, 0);
});

test("renter approval plus landlord rejection remains on hold", async () => {
  const service = new BondService();
  const created = service.propose("TR-2048", renter, proposalInput());
  const payloadHash = created.settlement!.currentProposal.payloadHash;
  service.approve("TR-2048", renter, { proposalVersion: 1, payloadHash });
  const result = service.approve("TR-2048", landlord, { proposalVersion: 1, payloadHash, decision: "rejected" });
  assert.equal(result.settlement?.status, "disputed");
  await assert.rejects(service.release("TR-2048", renter, { proposalVersion: 1, payloadHash }), (error: unknown) => error instanceof BondServiceError && error.code === "APPROVAL_QUORUM_INCOMPLETE");
});

test("renter rejection plus landlord approval remains on hold", () => {
  const service = new BondService();
  service.propose("TR-2048", renter, proposalInput());
  service.approve("TR-2048", renter, { proposalVersion: 1, decision: "rejected" });
  errorCode(() => service.approve("TR-2048", landlord, { proposalVersion: 1 }), "DISPUTE_OPEN");
});

test("third-party approval cannot override a dispute", () => {
  const service = new BondService();
  service.propose("TR-2048", renter, proposalInput());
  service.dispute("TR-2048", renter, { reason: "Disputed terms", intendedPathway: "rdrv" });
  errorCode(() => service.approve("TR-2048", { id: "observer-1", role: "third-party" } as unknown as BondActor, { proposalVersion: 1 }), "FORBIDDEN");
});

test("does not reveal a bond to an unrelated party", () => {
  const service = new BondService();
  errorCode(() => service.get("TR-2048", { id: "other-renter", role: "renter" }), "NOT_FOUND");
});
