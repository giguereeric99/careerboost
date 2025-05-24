import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();

    console.log(`Clerk webhook received: ${type} for user ${data.id}`);

    const supabaseAdmin = getAdminClient();

    switch (type) {
      case "user.created":
        console.log("🔄 Creating user via Admin API");

        // 1. Create user via Supabase Auth Admin API
        const { data: authUser, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: data.email_addresses[0]?.email_address,
            user_metadata: {
              clerk_id: data.id,
              first_name: data.first_name,
              last_name: data.last_name,
              provider: "clerk",
            },
            email_confirm: true, // Auto-confirm via Clerk
          });

        if (authError) {
          console.error("❌ Error creating auth user:", authError);
          return NextResponse.json(
            { error: authError.message },
            { status: 500 }
          );
        }

        console.log("✅ Supabase Auth user created:", authUser.user.id);

        // 2. Create user mapping with default subscription
        const { error: mappingError } = await supabaseAdmin
          .from("user_mapping")
          .insert({
            supabase_uuid: authUser.user.id,
            clerk_id: data.id,
            // Other columns (subscription_plan, etc.) use default values:
            // - subscription_plan: 'basic' (default)
            // - subscription_status: 'active' (default)
            // - subscription_period_end: now() + 1 year (default)
            // - usage_data: '{}' (default)
          });

        if (mappingError) {
          console.error("❌ Error creating mapping:", mappingError);
          return NextResponse.json(
            { error: mappingError.message },
            { status: 500 }
          );
        }

        console.log("✅ User mapping created successfully");
        break;

      case "user.updated":
        console.log("🔄 Updating user");

        // Get existing mapping
        const { data: mapping } = await supabaseAdmin
          .from("user_mapping")
          .select("supabase_uuid")
          .eq("clerk_id", data.id)
          .single();

        if (!mapping) {
          console.log("No mapping found, creating user instead");
          // Could redirect to user.created logic here
          console.log("Skipping update - user not found in mapping");
          break;
        }

        // Update user metadata in Supabase Auth
        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(mapping.supabase_uuid, {
            email: data.email_addresses[0]?.email_address,
            user_metadata: {
              clerk_id: data.id,
              first_name: data.first_name,
              last_name: data.last_name,
              provider: "clerk",
            },
          });

        if (updateError) {
          console.error("❌ Error updating user:", updateError);
        } else {
          console.log("✅ User updated successfully");
        }

        // Update mapping timestamp
        await supabaseAdmin
          .from("user_mapping")
          .update({ updated_at: new Date().toISOString() })
          .eq("clerk_id", data.id);

        break;

      case "user.deleted":
        console.log("🔄 Deleting user");

        // Get mapping to find Supabase user ID
        const { data: mappingToDelete } = await supabaseAdmin
          .from("user_mapping")
          .select("supabase_uuid")
          .eq("clerk_id", data.id)
          .single();

        if (mappingToDelete) {
          // Delete Supabase Auth user (will cascade delete mapping due to FK constraint)
          const { error: deleteError } =
            await supabaseAdmin.auth.admin.deleteUser(
              mappingToDelete.supabase_uuid
            );

          if (deleteError) {
            console.error("❌ Error deleting user:", deleteError);
          } else {
            console.log("✅ User deleted successfully");
          }
        } else {
          console.log("⚠️ No mapping found for deleted user");
        }
        break;

      default:
        console.log(`Unhandled webhook type: ${type}`);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        error: "Internal webhook error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Optional: Handle GET requests for webhook verification
export async function GET() {
  return NextResponse.json({
    message: "Clerk webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
