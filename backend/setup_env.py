#!/usr/bin/env python3
"""
Helper script to set up Amazon SP API credentials
"""
import os
import getpass

def setup_env():
    print("🔧 Amazon SP API Credentials Setup")
    print("=" * 40)
    print()
    print("You need to get these credentials from Amazon Seller Central:")
    print("1. Go to https://sellercentral.amazon.com/")
    print("2. Navigate to: Apps & Services → Develop Apps")
    print("3. Create a new app or use existing one")
    print("4. Get your Client ID, Client Secret, and Refresh Token")
    print()
    
    # Get credentials
    refresh_token = input("Enter your LWA_REFRESH_TOKEN: ").strip()
    client_id = input("Enter your LWA_CLIENT_ID: ").strip()
    client_secret = input("Enter your LWA_CLIENT_SECRET: ").strip()
    
    if not all([refresh_token, client_id, client_secret]):
        print("❌ Error: All credentials are required!")
        return
    
    # Create .env content
    env_content = f"""# Amazon SP API Credentials
LWA_REFRESH_TOKEN={refresh_token}
LWA_CLIENT_ID={client_id}
LWA_CLIENT_SECRET={client_secret}

# Optional Configuration
SP_API_REGION=US
SP_API_RATE_DELAY_SEC=1.2
SP_API_MAX_RETRIES=4
"""
    
    # Write to .env file
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print()
    print("✅ .env file created successfully!")
    print("You can now restart your backend server.")
    print()
    print("To test, run: python server.py")

if __name__ == "__main__":
    setup_env()
