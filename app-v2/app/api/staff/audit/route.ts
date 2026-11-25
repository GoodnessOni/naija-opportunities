import { auditEvent, parseAuditQuery } from "../../../../lib/listings/audit";
import { authenticateStaff, staffRpc, StaffRequestError } from "../../../../lib/listings/staff-store";

export async function GET(request: Request) {
  try {
    const staff = await authenticateStaff(request);
    const query = parseAuditQuery(new URL(request.url).searchParams);
    if (!query) return Response.json({ error: "invalid_query" }, { status: 400 });
    const events = auditEvent.array().parse(await staffRpc("staff_audit", { staff_user: staff.id, ...query }));
    return Response.json({ events }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof StaffRequestError) return Response.json({ error: error.code }, { status: error.status });
    return Response.json({ error: "staff_service_unavailable" }, { status: 503 });
  }
}
