#!/usr/bin/env python3
"""
Simple GIF search using Tenor API (free tier)
Fallback for gifgrep CLI when not available
"""

import json
import urllib.request
import urllib.parse
import sys
import os

# Tenor demo API key (public, rate-limited)
TENOR_API_KEY = os.environ.get('TENOR_API_KEY', 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ')
TENOR_CLIENT_KEY = 'clawdbot_gifgrep'

def search_gifs(query: str, limit: int = 5) -> list:
    """Search Tenor for GIFs"""
    base_url = "https://tenor.googleapis.com/v2/search"
    params = {
        'q': query,
        'key': TENOR_API_KEY,
        'client_key': TENOR_CLIENT_KEY,
        'limit': limit,
        'media_filter': 'gif,tinygif'
    }
    
    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Clawdbot/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
        
        results = []
        for item in data.get('results', []):
            media = item.get('media_formats', {})
            gif = media.get('gif', {})
            tinygif = media.get('tinygif', {})
            
            results.append({
                'id': item.get('id'),
                'title': item.get('content_description', ''),
                'url': gif.get('url', ''),
                'preview_url': tinygif.get('url', ''),
                'width': gif.get('dims', [0, 0])[0],
                'height': gif.get('dims', [0, 0])[1],
            })
        
        return results
    except Exception as e:
        print(f"Error searching GIFs: {e}", file=sys.stderr)
        return []


def get_random_gif(query: str) -> str:
    """Get a random GIF URL for a query"""
    results = search_gifs(query, limit=8)
    if results:
        import random
        return random.choice(results)['url']
    return None


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: gif-search.py <query> [--limit N] [--json] [--random]")
        sys.exit(1)
    
    query = sys.argv[1]
    limit = 5
    output_json = False
    random_one = False
    
    for i, arg in enumerate(sys.argv[2:], 2):
        if arg == '--limit' and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
        elif arg == '--json':
            output_json = True
        elif arg == '--random':
            random_one = True
    
    if random_one:
        url = get_random_gif(query)
        if url:
            print(url)
        else:
            print("No GIFs found", file=sys.stderr)
            sys.exit(1)
    else:
        results = search_gifs(query, limit)
        if output_json:
            print(json.dumps(results, indent=2))
        else:
            for r in results:
                print(f"{r['title'][:50]:50} {r['url']}")
