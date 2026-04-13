import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, venueId } = await request.json();

    if (!email || !venueId) {
      return NextResponse.json({ success: false, error: "Email and venueId required" });
    }

    // Find existing user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json({ success: false, error: listError.message });
    }

    const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });

      if (createError) {
        return NextResponse.json({ success: false, error: createError.message });
      }

      userId = newUser.user.id;
    }

    // Add to venue_admins
    const { error: adminError } = await supabaseAdmin
      .from("venue_admins")
      .upsert({ venue_id: venueId, user_id: userId }, { onConflict: 'venue_id,user_id' });

    if (adminError) {
      return NextResponse.json({ success: false, error: adminError.message });
    }

    // Send magic link email so they can log in
    const { error: magicLinkError } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://awaydayz.co/manage',
      }
    });

    if (magicLinkError) {
      // Still success even if email fails — just warn
      return NextResponse.json({ 
        success: true, 
        warning: "Bar added but failed to send login email: " + magicLinkError.message 
      });
    }

    return NextResponse.json({ success: true, emailSent: true });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}