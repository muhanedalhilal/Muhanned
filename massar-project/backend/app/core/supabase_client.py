import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Regular client — uses anon/public key
SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")

# Admin client — uses service_role key (required for auth.admin.* operations)
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: Supabase keys are missing from the .env file!")

if not SUPABASE_SERVICE_KEY:
    print("Warning: SUPABASE_SERVICE_KEY is missing. Profile email/password updates will not work.")

# Regular client for auth (login, signup, verify token)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY or "")

# Admin client — uses service_role key (required for auth.admin.* operations)
# Only create with service key if available, otherwise fall back to regular key
_admin_key = SUPABASE_SERVICE_KEY or SUPABASE_KEY or ""
if not _admin_key:
    print("Warning: No valid Supabase key found. Admin client will not work correctly.")
supabase_admin: Client = create_client(SUPABASE_URL, _admin_key) if _admin_key else supabase

