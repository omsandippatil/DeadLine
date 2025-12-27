import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(url);
      new URL(decodedUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const response = await fetch(decodedUrl, {
      next: {
        revalidate: false,
        tags: [`title-${decodedUrl}`]
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      cache: 'force-cache',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const urlObj = new URL(decodedUrl);
      const domain = urlObj.hostname.replace('www.', '');
      const fallbackTitle = domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0];
      
      return NextResponse.json(
        { title: fallbackTitle },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
          }
        }
      );
    }

    const html = await response.text();
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const twitterTitleMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
    
    let title = ogTitleMatch?.[1] || twitterTitleMatch?.[1] || titleMatch?.[1];
    
    if (!title) {
      const urlObj = new URL(decodedUrl);
      const domain = urlObj.hostname.replace('www.', '');
      title = domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0];
    }

    title = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    return NextResponse.json(
      { title },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
        }
      }
    );
  } catch (error) {
    console.error('Error fetching page title:', error);
    
    const url = request.nextUrl.searchParams.get('url');
    if (url) {
      try {
        const urlObj = new URL(decodeURIComponent(url));
        const domain = urlObj.hostname.replace('www.', '');
        const fallbackTitle = domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0];
        
        return NextResponse.json(
          { title: fallbackTitle },
          { 
            status: 200,
            headers: {
              'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
            }
          }
        );
      } catch {
        return NextResponse.json(
          { error: 'Failed to fetch page title' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch page title' },
      { status: 500 }
    );
  }
}