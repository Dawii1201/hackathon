import { type NextRequest } from "next/server";
import { actorFromRequest, jsonData, jsonError, readJson } from "../../../../../lib/bonds/route-support";
import { bondService } from "../../../../../lib/bonds/service";
import type { ProposeTermsInput } from "../../../../../lib/api/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return jsonData(bondService.propose(id, await actorFromRequest(request), await readJson<ProposeTermsInput>(request)), 201);
  } catch (error) {
    return jsonError(error);
  }
}
