from supabase import create_client, Client

SUPABASE_URL = "https://oqzbjoldijuunicscyvc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xemJqb2xkaWp1dW5pY3NjeXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTM5MzgsImV4cCI6MjA2ODU2OTkzOH0.9RRABx39WxoDUeFvgt515KNM5e6R-TgLgGTBK8LHREo"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Optional: test connection
if __name__ == "__main__":
    result = supabase.table("users").select("*").limit(2).execute()
    print(result.data)
