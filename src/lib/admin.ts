import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffProfile = { id: string; role: "editor" | "admin"; displayName: string };

/** Vérifie que l'utilisateur connecté est éditeur ou admin ; redirige sinon.
 *  Ceci n'est qu'un confort de navigation : la vraie barrière reste la RLS
 *  (is_staff()/is_admin()), qui protège les données même si cette fonction
 *  était contournée. */
export async function requireStaff(): Promise<StaffProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "editor" && profile.role !== "admin")) redirect("/tableau-de-bord");

  return { id: user.id, role: profile.role as "editor" | "admin", displayName: profile.display_name };
}
