#!/usr/bin/env python3
"""
Comprehensive test script for MikroTik Monitoring System
Tests backend connectivity, API endpoints, and frontend functionality
"""

import requests
import json
import time
import sys
import os

# Configuration
BACKEND_URL = "http://localhost:80"
FRONTEND_URL = "http://localhost:3000"

def test_backend_health():
    """Test if backend is running and responding"""
    print("🔍 Testing backend health...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running and healthy")
            return True
        else:
            print(f"❌ Backend returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def test_api_endpoints():
    """Test key API endpoints"""
    print("\n🔍 Testing API endpoints...")
    
    endpoints = [
        ("/api/status", "Status endpoint"),
        ("/api/routers", "Routers endpoint"),
        ("/api/routers/active", "Active router endpoint"),
        ("/api/ppp_accounts_summary", "PPP accounts summary"),
        ("/api/dashboard", "Dashboard endpoint"),
    ]
    
    all_passed = True
    for endpoint, description in endpoints:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=5)
            if response.status_code == 200:
                print(f"✅ {description}: OK")
            else:
                print(f"❌ {description}: Status {response.status_code}")
                all_passed = False
        except requests.exceptions.RequestException as e:
            print(f"❌ {description}: Failed - {e}")
            all_passed = False
    
    return all_passed

def test_ppp_accounts_summary():
    """Test the PPP accounts summary endpoint specifically"""
    print("\n🔍 Testing PPP accounts summary...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/ppp_accounts_summary", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                stats = data.get('statistics', {})
                print(f"✅ PPP Summary: {stats.get('total_accounts', 0)} total accounts")
                print(f"   - Online: {stats.get('online_accounts', 0)}")
                print(f"   - Offline: {stats.get('offline_accounts', 0)}")
                print(f"   - Enabled: {stats.get('enabled_accounts', 0)}")
                print(f"   - Disabled: {stats.get('disabled_accounts', 0)}")
                
                offline_accounts = data.get('offline_accounts', [])
                if offline_accounts:
                    print(f"   - Sample offline account: {offline_accounts[0].get('name', 'N/A')}")
                    print(f"     Status: {offline_accounts[0].get('status', 'N/A')}")
                    print(f"     Last uptime: {offline_accounts[0].get('last_uptime', 'N/A')}")
                
                return True
            else:
                print(f"❌ PPP Summary failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ PPP Summary returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ PPP Summary test failed: {e}")
        return False

def test_frontend_connectivity():
    """Test if frontend is accessible"""
    print("\n🔍 Testing frontend connectivity...")
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        if response.status_code == 200:
            print("✅ Frontend is accessible")
            return True
        else:
            print(f"❌ Frontend returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Frontend connection failed: {e}")
        return False

def check_data_files():
    """Check if required data files exist"""
    print("\n🔍 Checking data files...")
    
    required_files = [
        "data/routers.json",
        "data/groups/groups.json",
        "data/categories.json"
    ]
    
    all_exist = True
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}: Exists")
        else:
            print(f"❌ {file_path}: Missing")
            all_exist = False
    
    return all_exist

def main():
    """Run all tests"""
    print("🚀 Starting MikroTik Monitoring System Tests")
    print("=" * 50)
    
    tests = [
        ("Backend Health", test_backend_health),
        ("API Endpoints", test_api_endpoints),
        ("PPP Accounts Summary", test_ppp_accounts_summary),
        ("Frontend Connectivity", test_frontend_connectivity),
        ("Data Files", check_data_files),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! System is ready.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 