"""
A simple CORS proxy implementation to help with development.
"""
import requests
from fastapi import Request

async def proxy_request(request: Request, target_url: str):
    """
    Proxy a request to target_url and return the response.
    This helps bypass CORS issues during development.
    """
    # Get request method
    method = request.method.lower()
    
    # Get request body if any
    body = await request.body() if method in ['post', 'put', 'patch'] else None
    
    # Get request headers (excluding host)
    headers = {k: v for k, v in request.headers.items() if k.lower() != 'host'}
    
    # Get request params
    params = {}
    if request.query_params:
        for key, value in request.query_params.items():
            params[key] = value
    
    # Make the request to the target URL
    response = requests.request(
        method=method,
        url=target_url,
        headers=headers,
        params=params,
        data=body
    )
    
    # Return the response content, status code and headers
    return {
        "status_code": response.status_code,
        "content": response.content,
        "headers": dict(response.headers),
        "url": response.url,
        "text": response.text
    }
