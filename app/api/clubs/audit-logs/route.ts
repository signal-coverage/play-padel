import { NextResponse, type NextRequest } from "next/server";
import { listAuditLogs } from "@/core/audit/services/audit.service";
import { requireOwnerClub } from "../_lib/require-owner";

export async function GET(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const entity = request.nextUrl.searchParams.get("entity") ?? undefined;
  const action = request.nextUrl.searchParams.get("action") ?? undefined;
  const pageParam = request.nextUrl.searchParams.get("page");
  const pageSizeParam = request.nextUrl.searchParams.get("pageSize");

  const page = pageParam ? Number(pageParam) : undefined;
  const pageSize = pageSizeParam ? Number(pageSizeParam) : undefined;

  if (
    (pageParam && (!Number.isInteger(page) || page! < 1)) ||
    (pageSizeParam && (!Number.isInteger(pageSize) || pageSize! < 1))
  ) {
    return NextResponse.json(
      { error: "page and pageSize must be positive integers" },
      { status: 400 },
    );
  }

  try {
    const result = await listAuditLogs(authResult.context.clubId, {
      ...(entity && { entity }),
      ...(action && { action }),
      ...(page && { page }),
      ...(pageSize && { pageSize }),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load audit logs" },
      { status: 500 },
    );
  }
}
