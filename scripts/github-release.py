#!/usr/bin/env python3
"""
GitHub Release Automation Script for Attrition Game
Handles uploading large installer files (>100MB) to GitHub Releases
"""

import requests
import os
import sys
import json
from pathlib import Path

def create_github_release(repo, version, installer_path, token, release_notes=""):
    """
    Creates a GitHub release and uploads the installer asset
    
    Args:
        repo: Repository in format "owner/repo-name"
        version: Version tag (e.g., "v1.0.9")
        installer_path: Path to the installer file
        token: GitHub Personal Access Token
        release_notes: Optional release notes
    """
    
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Attrition-Release-Bot'
    }
    
    installer_file = Path(installer_path)
    if not installer_file.exists():
        raise FileNotFoundError(f"Installer not found: {installer_path}")
    
    print(f"Creating release {version} for {repo}...")
    
    # Step 1: Create the release
    release_data = {
        'tag_name': version,
        'target_commitish': 'main',
        'name': f'Attrition {version}',
        'body': release_notes or f'Attrition Desktop Release {version}',
        'draft': False,
        'prerelease': False
    }
    
    create_response = requests.post(
        f'https://api.github.com/repos/{repo}/releases',
        headers=headers,
        json=release_data
    )
    
    if create_response.status_code != 201:
        raise Exception(f"Failed to create release: {create_response.status_code} - {create_response.text}")
    
    release_data = create_response.json()
    release_id = release_data['id']
    upload_url = release_data['upload_url'].split('{')[0]  # Remove template part
    
    print(f"✅ Release created: {release_data['html_url']}")
    
    # Step 2: Upload the installer asset
    print(f"Uploading installer: {installer_file.name} ({installer_file.stat().st_size / 1024 / 1024:.1f} MB)...")
    
    upload_headers = headers.copy()
    upload_headers['Content-Type'] = 'application/octet-stream'
    
    params = {'name': installer_file.name}
    
    with open(installer_path, 'rb') as f:
        upload_response = requests.post(
            upload_url,
            headers=upload_headers,
            params=params,
            data=f
        )
    
    if upload_response.status_code != 201:
        raise Exception(f"Failed to upload asset: {upload_response.status_code} - {upload_response.text}")
    
    asset_data = upload_response.json()
    download_url = asset_data['browser_download_url']
    
    print(f"✅ Asset uploaded successfully!")
    print(f"📦 Download URL: {download_url}")
    
    return {
        'release_url': release_data['html_url'],
        'download_url': download_url,
        'release_id': release_id
    }

def main():
    """Main function for command-line usage"""
    if len(sys.argv) < 4:
        print("Usage: python github-release.py <repo> <version> <installer_path> [release_notes]")
        print("Example: python github-release.py BrianSMitchell/attrition-game v1.0.10 'packages/releases/Attrition-Setup-1.0.10.exe'")
        sys.exit(1)
    
    repo = sys.argv[1]
    version = sys.argv[2]
    installer_path = sys.argv[3]
    release_notes = sys.argv[4] if len(sys.argv) > 4 else ""
    
    # Get token from environment variable
    token = os.getenv('GITHUB_PAT') or os.getenv('GITHUB_TOKEN')
    if not token:
        print("❌ Error: GITHUB_PAT or GITHUB_TOKEN environment variable not set")
        print("Generate a token at: https://github.com/settings/tokens")
        sys.exit(1)
    
    try:
        result = create_github_release(repo, version, installer_path, token, release_notes)
        print(f"\n🎉 Release {version} created successfully!")
        print(f"🔗 Release page: {result['release_url']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
