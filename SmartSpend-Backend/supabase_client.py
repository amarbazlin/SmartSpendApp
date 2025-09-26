from supabase import create_client, Client

SUPABASE_URL = "https://oqzbjoldijuunicscyvc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xemJqb2xkaWp1dW5pY3NjeXZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjk5MzkzOCwiZXhwIjoyMDY4NTY5OTM4fQ.wjgZqk_1xa_z9qbwXTBIrkBwuPFsdf1ylFbanpV2hMk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Optional: test connection
if __name__ == "__main__":
    result = supabase.table("users").select("*").limit(2).execute()
    print(result.data)
