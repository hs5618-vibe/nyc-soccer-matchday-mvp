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

    // Find user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json({ success: false, error: listError.message });
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (user) {
      userId = user.id;
    } else {
      // Create user with magic link
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

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}