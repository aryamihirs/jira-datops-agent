"""
Simple test endpoint to verify Vercel Python runtime is working
"""

def handler(event, context):
    """Minimal Lambda-style handler for testing"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
        },
        'body': '{"status": "ok", "message": "Python runtime is working"}'
    }
