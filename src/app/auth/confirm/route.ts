import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Target of the signup confirmation email link. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let failed = true;
  if (code) failed = Boolean((await supabase.auth.exchangeCodeForSession(code)).error);
  else if (tokenHash && type) failed = Boolean((await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error);

  return NextResponse.redirect(new URL(failed ? "/masuk?konfirmasi=gagal" : "/belajar", request.url));
}
