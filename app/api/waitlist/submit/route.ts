import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company, role, app_interest } = body;

    // Validation
    if (!name || !email || !company || !role || !app_interest) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Insert into waitlist table
    const { data, error } = await supabaseAdmin
      .from("waitlist")
      .insert({
        name,
        email,
        company,
        role,
        app_interest,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to join waitlist" },
        { status: 500 }
      );
    }

    // TODO: Send auto-response email via Resend
    // You can add this later with full sales pitch email template
    // Example:
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'dpow.ai <hello@dpow.co.uk>',
    //     to: email,
    //     subject: `Welcome to the ${app_interest} waitlist!`,
    //     html: emailTemplate, // Create this template
    //   }),
    // });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
