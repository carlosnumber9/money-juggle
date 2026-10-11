import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import { discoverCategoryRules } from "@/lib/models/discoverCategoryRules";
export const runtime = "nodejs";
export const maxDuration = 120;
let discovering = false;
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { ok: false, reason: "Origen no permitido." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
  const user = await bankingDataSource.getCurrentUser();
  if (!user || !user.isAllowed)
    return NextResponse.json(
      { ok: false, reason: "Inicia sesión de nuevo para detectar reglas." },
      {
        status: user ? 403 : 401,
        headers: { "Cache-Control": "private, no-store" }
      }
    );
  if (discovering)
    return NextResponse.json(
      {
        ok: false,
        reason: "Ya hay una detección en curso. Inténtalo más tarde."
      },
      { status: 409, headers: { "Cache-Control": "private, no-store" } }
    );
  discovering = true;
  try {
    const value = await discoverCategoryRules(user.id, new Date());
    revalidatePath("/");
    return NextResponse.json(
      { ok: true, value },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "No se pudo completar detección. Puedes seguir gestionando reglas e intentarlo de nuevo."
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  } finally {
    discovering = false;
  }
}
