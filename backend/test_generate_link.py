import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("missing keys")
    exit(1)

supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
resp = supabase_admin.auth.admin.generate_link(
    {"type": "recovery", "email": "ss7zh.ss7zh@gmail.com", "options": {"redirect_to": "http://localhost:5173/?page=reset-password"}}
)

print(dir(resp))
print(getattr(resp, 'properties', None))
