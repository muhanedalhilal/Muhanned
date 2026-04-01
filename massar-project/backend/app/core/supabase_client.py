import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# We pull these instantly from the .env you just set up!
SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: Supabase keys are missing from the .env file!")

# Initialize the blazing-fast Supabase python client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
