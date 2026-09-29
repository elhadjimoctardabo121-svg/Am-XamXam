import { NextResponse, type NextRequest } from "next/server";
import { verifyPaytechIpn } from "@/lib/payment/paytech";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reçoit la notification serveur-à-serveur de PayTech après un paiement.
 * Utilise la clé service_role (contourne les RLS) : c'est la signature IPN
 * (voir verifyPaytechIpn), pas une session utilisateur, qui prouve que la
 * requête vient bien de PayTech.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const get = (key: string) => (form.get(key) ? String(form.get(key)) : undefined);

  const verified = await verifyPaytechIpn({
    api_key_sha256: get("api_key_sha256"),
    api_secret_sha256: get("api_secret_sha256"),
  });
  if (!verified) return new NextResponse("IPN KO - NOT FROM PAYTECH", { status: 403 });

  const typeEvent = get("type_event");
  const refCommand = get("ref_command"); // = payments.id
  const providerRef = get("token") ?? refCommand;
  if (!refCommand) return new NextResponse("IPN KO - missing ref_command", { status: 400 });

  const admin = createAdminClient();
  if (!admin) return new NextResponse("IPN KO - server not configured", { status: 500 });

  const { data: payment } = await admin
    .from("payments")
    .select("id, user_id, plan_id, status")
    .eq("id", refCommand)
    .single();
  if (!payment) return new NextResponse("IPN OK", { status: 200 }); // inconnu : on accuse réception sans agir

  if (payment.status !== "pending") return new NextResponse("IPN OK", { status: 200 }); // déjà traité

  if (typeEvent === "sale_canceled") {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    return new NextResponse("IPN OK", { status: 200 });
  }

  if (typeEvent !== "sale_complete") return new NextResponse("IPN OK", { status: 200 });

  const { data: plan } = await admin.from("plans").select("code, scope, duration_days").eq("id", payment.plan_id).single();
  if (!plan) return new NextResponse("IPN OK", { status: 200 });

  const { data: student } = await admin.from("students").select("class_id").eq("id", payment.user_id).single();

  let subjectId: string | null = null;
  const customFieldRaw = get("custom_field");
  if (customFieldRaw) {
    try {
      subjectId = (JSON.parse(customFieldRaw) as { subjectId?: string | null }).subjectId ?? null;
    } catch {
      subjectId = null;
    }
  }

  await admin.from("payments").update({ status: "success", provider_ref: providerRef, paid_at: new Date().toISOString() }).eq("id", payment.id);

  await admin.from("subscriptions").insert({
    user_id: payment.user_id,
    class_id: plan.scope === "classe" ? (student?.class_id ?? null) : null,
    subject_id: plan.scope === "matiere" ? subjectId : null,
    plan: plan.code,
    status: "active",
    source: "payment",
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString(),
  });

  return new NextResponse("IPN OK", { status: 200 });
}
