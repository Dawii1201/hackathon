import { type NextRequest } from "next/server";
import { actorFromRequest, jsonData, jsonError } from "../../../lib/bonds/route-support";
import { bondService } from "../../../lib/bonds/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    return jsonData(bondService.list(await actorFromRequest(request)));
  } catch (error) {
    return jsonError(error);
  }
}
