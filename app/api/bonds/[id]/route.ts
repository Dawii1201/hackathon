import { type NextRequest } from "next/server";
import { actorFromRequest, jsonData, jsonError } from "../../../../lib/bonds/route-support";
import { bondService } from "../../../../lib/bonds/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return jsonData(bondService.get(id, await actorFromRequest(request)));
  } catch (error) {
    return jsonError(error);
  }
}
