import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { sendBreachAlert } from "@/lib/alert";

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await sendBreachAlert({
    reason: "hotlink_attempt",
    device_uuid: "test-device-00000000",
    ip: "0.0.0.0",
    extra: "This is a test alert — Resend integration verified.",
  });

  return NextResponse.json({ ok: true });
}
