import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import config from '../../../api/config.json';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const API_SECRET_KEY = process.env.API_SECRET_KEY;

interface EventDetails {
  location: string;
  details: string;
  accused: string[];
  victims: string[];
  timeline: string[];
  sources: string[];
  images: string[];
}

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
}

interface ScrapedArticle {
  url: string;
  title: string;
  content: string;
  publishDate?: string;
  author?: string;
  source: string;
}

interface ScrapedData {
  results: GoogleSearchResult[];
  articles: ScrapedArticle[];
  images: string[];
}

const EVENT_DETAILS_TEMPLATE = {
  location: "string - Detailed location information including city, state/province, country, specific venues, addresses, and geographical context",
  details: "string - Comprehensive detailed narrative of what happened, including background context, sequence of events, circumstances leading up to the incident, what specifically occurred, immediate aftermath, ongoing developments, legal proceedings, investigations, evidence found, witness testimonies, official statements, media coverage details, public reactions, and all significant aspects of the event",
  accused: ["array of strings - Full names of all accused parties, suspects, defendants, organizations, companies, or entities involved, including their roles, positions, backgrounds, and relationship to the incident"],
  victims: ["array of strings - Full names and detailed information about all victims, affected parties, casualties, injured persons, including their ages, backgrounds, conditions, and impact suffered"],
  timeline: ["array of strings - Comprehensive chronological sequence of events with specific dates, times, and detailed descriptions of what happened at each stage, including pre-incident events, the main incident phases, immediate response, investigation milestones, legal proceedings, and ongoing developments"]
};

function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

function isHTMLResponse(response: string): boolean {
  return response.trim().toLowerCase().startsWith('<!doctype') || 
         response.trim().toLowerCase().startsWith('<html');
}

function extractArticleContent(html: string, url: string): ScrapedArticle {
  let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  const titleMatch = cleanHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  const metaDescMatch = cleanHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const metaContent = metaDescMatch ? metaDescMatch[1] : '';
  
  const articleMatches = cleanHtml.match(/<(?:article|main|div[^>]*class=["'][^"']*(?:content|article|post|story|news)[^"']*["'])[^>]*>([\s\S]*?)<\/(?:article|main|div)>/gi);
  let content = '';
  
  if (articleMatches && articleMatches.length > 0) {
    const longestMatch = articleMatches.reduce((a, b) => a.length > b.length ? a : b);
    content = longestMatch.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  if (!content || content.length < 200) {
    const paragraphs = cleanHtml.match(/<p[^>]*>([^<]+)<\/p>/gi);
    if (paragraphs) {
      content = paragraphs.map(p => p.replace(/<[^>]*>/g, '')).join(' ').trim();
    }
  }
  
  if (!content || content.length < 200) {
    const divMatches = cleanHtml.match(/<div[^>]*>([^<]*(?:<[^\/][^>]*>[^<]*<\/[^>]*>[^<]*)*)<\/div>/gi);
    if (divMatches) {
      const textContent = divMatches.map(div => div.replace(/<[^>]*>/g, ' ')).join(' ').trim();
      if (textContent.length > content.length) {
        content = textContent;
      }
    }
  }
  
  if (!content || content.length < 100) {
    content = metaContent;
  }
  
  const source = new URL(url).hostname.replace('www.', '');
  
  return {
    url,
    title,
    content: content.substring(0, 4000),
    publishDate: '',
    author: '',
    source
  };
}

async function scrapeArticle(url: string): Promise<ScrapedArticle | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    return extractArticleContent(html, url);
    
  } catch (error) {
    console.warn(`Error scraping ${url}:`, error);
    return null;
  }
}

async function searchImages(query: string): Promise<string[]> {
  const API_KEY = process.env.GOOGLE_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    console.warn('Google API credentials not configured for image search');
    return [];
  }

  try {
    console.log('Searching for images...');
    
    const imageSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=10&safe=active&imgSize=medium`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const imageResponse = await fetch(imageSearchUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);

    if (!imageResponse.ok) {
      console.warn(`Image search failed with status: ${imageResponse.status}`);
      return [];
    }

    const imageResponseText = await imageResponse.text();
    
    if (!isValidJSON(imageResponseText) || isHTMLResponse(imageResponseText)) {
      console.warn('Invalid JSON response from image search');
      return [];
    }

    const imageData = JSON.parse(imageResponseText);
    
    if (imageData.error) {
      console.warn('Image search API error:', imageData.error);
      return [];
    }

    if (!imageData.items || !Array.isArray(imageData.items)) {
      console.warn('No image items found in response');
      return [];
    }

    const imageLinks = imageData.items
      .map((item: any) => item.link)
      .filter(Boolean)
      .filter((link: string) => {
        const url = link.toLowerCase();
        return !url.includes('favicon') && 
               !url.includes('/logo') && 
               !url.includes('/icon') &&
               (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || 
                url.includes('.webp') || url.includes('.gif') || url.includes('image'));
      })
      .slice(0, 10);

    console.log(`Found ${imageLinks.length} valid image links`);
    return imageLinks;

  } catch (error) {
    console.warn('Image search error:', error);
    return [];
  }
}

async function searchGoogleAndScrape(query: string): Promise<ScrapedData> {
  const API_KEY = process.env.GOOGLE_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    throw new Error('Google API credentials not configured');
  }

  try {
    const allResults: GoogleSearchResult[] = [];

    for (let page = 1; page <= 3; page++) {
      const startIndex = (page - 1) * 10 + 1;
      
      const webSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=10&start=${startIndex}`;
      
      console.log(`Making web search request for page ${page}...`);
      
      try {
        const webResponse = await fetch(webSearchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!webResponse.ok) {
          console.warn(`Web search page ${page} failed:`, webResponse.status);
          continue;
        }

        const webResponseText = await webResponse.text();
        
        if (isHTMLResponse(webResponseText) || !isValidJSON(webResponseText)) {
          console.warn(`Invalid response for page ${page}, skipping`);
          continue;
        }

        const webData = JSON.parse(webResponseText);

        if (webData.error) {
          console.warn(`API error on page ${page}:`, webData.error);
          continue;
        }

        const pageResults: GoogleSearchResult[] = webData.items?.map((item: any) => ({
          title: item.title || 'No title',
          link: item.link || '',
          snippet: item.snippet || 'No snippet available',
          displayLink: item.displayLink || '',
        })) || [];

        allResults.push(...pageResults);
        console.log(`Page ${page}: Found ${pageResults.length} results`);

        if (page < 3) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.warn(`Error on page ${page}:`, error);
        continue;
      }
    }

    console.log(`Total search results: ${allResults.length}`);

    const filteredResults = allResults.filter((result, index, self) => {
      const isDuplicate = index !== self.findIndex(r => r.link === result.link);
      if (isDuplicate) return false;
      
      const url = result.link.toLowerCase();
      const domain = result.displayLink?.toLowerCase() || '';
      
      const excludeDomains = ['reddit.com', 'twitter.com', 'facebook.com', 'youtube.com', 'instagram.com', 'tiktok.com', 'pinterest.com'];
      const isExcluded = excludeDomains.some(excluded => domain.includes(excluded) || url.includes(excluded));
      
      return !isExcluded && result.title && result.snippet;
    });

    console.log(`Filtered to ${filteredResults.length} valid results`);

    const articlesToScrape = filteredResults.slice(0, 18);
    console.log(`Scraping content from ${articlesToScrape.length} articles...`);
    
    const scrapePromises = articlesToScrape.map(result => scrapeArticle(result.link));
    const scrapedArticles = await Promise.allSettled(scrapePromises);
    
    const successfulArticles: ScrapedArticle[] = scrapedArticles
      .filter((result): result is PromiseFulfilledResult<ScrapedArticle> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
      .filter(article => article.content.length > 100);

    console.log(`Successfully scraped ${successfulArticles.length} articles`);

    const imageLinks = await searchImages(query);
    console.log(`Found ${imageLinks.length} image URLs`);

    return { 
      results: filteredResults, 
      articles: successfulArticles,
      images: imageLinks
    };

  } catch (error) {
    console.error('Google Search API error:', error);
    throw new Error(`Failed to fetch data from Google Search API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function processArticlesWithGroq(scrapedData: ScrapedData, query: string): Promise<Omit<EventDetails, 'images' | 'sources'>> {
  const topArticles = scrapedData.articles
    .sort((a, b) => b.content.length - a.content.length)
    .slice(0, 15);

  const articleContent = topArticles.map((article, index) => {
    const contentToUse = article.content.substring(0, 3500);
    return `
=== ARTICLE ${index + 1}: ${article.source.toUpperCase()} ===
Title: ${article.title}
URL: ${article.url}
Content: ${contentToUse}
---`;
  }).join('\n\n');

  const topSnippets = scrapedData.results
    .slice(0, 10)
    .map((result, index) => `${index + 1}. [${result.displayLink}] ${result.title}: ${result.snippet}`)
    .join('\n');

  const prompt = `Extract *exhaustive and comprehensive* structured information about: "${query}"

ARTICLES:
${articleContent}

SNIPPETS:
${topSnippets}

*CRITICAL: Extract MAXIMUM detail for EVERY field. Your response must be extremely thorough, comprehensive, and packed with ALL available information.*

*LOCATION*: Extract *complete geographical context* including exact addresses, specific venue names, building details, city, state/province, country, regional context, nearby landmarks, facility descriptions, and any location-specific circumstances. *Be exhaustive*.

*DETAILS*: Provide an *extensive, comprehensive narrative* covering: complete background and historical context, detailed circumstances leading to the event, step-by-step chronological sequence of what happened, *all parties involved* with their roles and relationships, *specific actions and decisions* made by each party, *detailed investigation findings* and evidence discovered, *complete legal proceedings* including charges and court information, *all official statements* and press releases, *witness testimonies* and accounts, *media coverage specifics*, *public reactions* and social impact, *current ongoing status*, *consequences and impact* on all parties, *any controversies or disputes*, and *conflicting information* if present. *Include specific quotes, statistics, and facts wherever available*. This section should be the *most detailed and comprehensive* part of your response.

*ACCUSED*: List *ALL individuals, organizations, or entities* with: complete full names and any known aliases, exact positions and titles held, professional background and history, *detailed description of their involvement* and role in the incident, *specific charges or allegations* against them, relevant background information, *their responses or statements*, current legal status, and *any additional context* about each party.

*VICTIMS*: Provide *comprehensive information* about all affected parties including: full names where available, ages and demographic details, personal background information, *detailed description of harm or impact suffered*, current condition and status, *their relationship to the incident*, how they were specifically affected, *statements from victims or families*, and *ongoing impact* on their lives.

*TIMELINE*: Create an *extremely detailed chronological sequence* with: exact dates and specific times when available, *comprehensive descriptions of what occurred at each stage*, pre-incident background events and context, *step-by-step progression* of the main incident with granular detail, immediate response and emergency actions, *investigation milestones* with dates, *legal proceedings timeline* including court dates and decisions, media coverage evolution, public reaction timeline, and *all ongoing developments*. Each timeline entry should be *highly descriptive* with multiple sentences explaining what happened.

*EXTRACTION REQUIREMENTS*:
- *Maximize information density* in every field
- Include *specific names, dates, times, places, and numbers*
- Use *direct quotes* from sources when impactful
- Provide *extensive detail* rather than summaries
- Extract *ALL available information* from the articles
- Be *thorough and comprehensive* above all else
- *Details field should be 1000+ words* when sufficient source material exists
- *Timeline should have 10+ detailed entries* when information is available

Return *ONLY* valid JSON matching this structure:

${JSON.stringify(EVENT_DETAILS_TEMPLATE, null, 2)}

Use *only explicit information* from provided content. *Maximize detail extraction* while maintaining accuracy. Use empty strings/arrays only when data is genuinely unavailable.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: config.groq.model,
      temperature: config.groq.temperature,
      max_tokens: config.groq.max_tokens,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Groq API');
    }

    const cleanedResponse = response.trim();
    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON response from Groq - no JSON object found');
    }
    
    const jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
    
    if (!isValidJSON(jsonString)) {
      console.error('Invalid JSON from Groq:', jsonString.substring(0, 500));
      throw new Error('Invalid JSON format from Groq response');
    }

    const parsedData = JSON.parse(jsonString);
    
    const requiredFields: (keyof Omit<EventDetails, 'images' | 'sources'>)[] = ['location', 'details', 'accused', 'victims', 'timeline'];
    for (const field of requiredFields) {
      if (!(field in parsedData)) {
        parsedData[field] = Array.isArray(EVENT_DETAILS_TEMPLATE[field]) ? [] : '';
      }
    }
    
    return parsedData;
    
  } catch (error) {
    console.error('Groq processing error:', error);
    throw new Error(`Failed to process data with Groq API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fetchEventFromDatabase(event_id: string) {
  const { data: eventData, error: fetchError } = await supabase
    .from('events')
    .select('query, title')
    .eq('event_id', event_id)
    .single();
    
  if (fetchError) {
    console.error('Event fetch error:', fetchError);
    throw new Error(`Event not found: ${fetchError.message}`);
  }
  
  if (!eventData || !eventData.query) {
    throw new Error('Event not found or missing query');
  }
  
  return eventData;
}

async function saveEventDetails(event_id: string, structuredData: EventDetails) {
  console.log(`Saving event details for ${event_id}:`);
  console.log(`- Sources: ${structuredData.sources.length}`);
  console.log(`- Images: ${structuredData.images.length}`);

  const { data: existingDetails, error: checkError } = await supabase
    .from('event_details')
    .select('event_id')
    .eq('event_id', event_id)
    .single();

  const timestamp = new Date().toISOString();
  
  let dbOperation;
  if (existingDetails && !checkError) {
    console.log('Updating existing record...');
    dbOperation = supabase
      .from('event_details')
      .update({
        location: structuredData.location,
        details: structuredData.details,
        accused: structuredData.accused,
        victims: structuredData.victims,
        timeline: structuredData.timeline,
        sources: structuredData.sources,
        images: structuredData.images,
        updated_at: timestamp
      })
      .eq('event_id', event_id);
  } else {
    console.log('Inserting new record...');
    dbOperation = supabase
      .from('event_details')
      .insert({
        event_id: event_id,
        location: structuredData.location,
        details: structuredData.details,
        accused: structuredData.accused,
        victims: structuredData.victims,
        timeline: structuredData.timeline,
        sources: structuredData.sources,
        images: structuredData.images,
        created_at: timestamp,
        updated_at: timestamp
      });
  }

  const { error: saveError } = await dbOperation;
  if (saveError) {
    console.error('Database save error:', saveError);
    throw new Error(`Failed to save event details: ${saveError.message}`);
  }
  
  console.log('Successfully saved event details');
}

async function updateEventTimestamp(event_id: string) {
  const { error: updateError } = await supabase
    .from('events')
    .update({ last_updated: new Date().toISOString() })
    .eq('event_id', event_id);

  if (updateError) {
    console.warn('Failed to update timestamp:', updateError);
  }
}

async function processEvent(event_id: string) {
  console.log(`Processing event for detailed analysis: ${event_id}`);

  const eventData = await fetchEventFromDatabase(event_id);
  console.log(`Event: ${eventData.title}`);
  console.log(`Query: ${eventData.query}`);

  console.log('Conducting comprehensive search and scraping...');
  const scrapedData = await searchGoogleAndScrape(eventData.query);

  if (!scrapedData.articles || scrapedData.articles.length === 0) {
    throw new Error('No articles found or scraped');
  }

  console.log(`Scraped ${scrapedData.articles.length} articles and found ${scrapedData.images.length} images for detailed analysis`);

  console.log('Processing with Groq for comprehensive detailed analysis...');
  const analyzedData = await processArticlesWithGroq(scrapedData, eventData.query);

  const scrapedSourceUrls = scrapedData.articles
    .filter(article => article.url && article.content.length > 100)
    .map(article => article.url);

  const structuredData: EventDetails = {
    ...analyzedData,
    sources: scrapedSourceUrls,
    images: scrapedData.images
  };

  console.log(`Detailed analysis complete: ${scrapedSourceUrls.length} sources analyzed, ${scrapedData.images.length} images found`);
  console.log(`Details length: ${structuredData.details.length} characters`);
  console.log(`Timeline events: ${structuredData.timeline.length}`);
  console.log(`Accused parties: ${structuredData.accused.length}`);
  console.log(`Victims: ${structuredData.victims.length}`);

  await saveEventDetails(event_id, structuredData);
  await updateEventTimestamp(event_id);

  console.log('Successfully completed detailed processing');

  return {
    eventData,
    structuredData,
    scrapedData
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get('event_id');
    const api_key = searchParams.get('api_key');

    if (!api_key || api_key !== API_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    if (!event_id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const { eventData, structuredData, scrapedData } = await processEvent(event_id);

    return NextResponse.json({
      success: true,
      message: "Event analyzed and saved successfully with detailed information",
      event_id: event_id,
      event_title: eventData.title,
      query_used: eventData.query,
      articles_scraped: structuredData.sources.length,
      images_found: structuredData.images.length,
      sources_analyzed: [...new Set(scrapedData.articles.map(a => a.source))].join(', '),
      analysis_summary: {
        location: structuredData.location,
        accused_count: structuredData.accused.length,
        victims_count: structuredData.victims.length,
        timeline_events: structuredData.timeline.length,
        details_length: structuredData.details.length,
        total_content_analyzed: scrapedData.articles.reduce((sum, article) => sum + article.content.length, 0)
      }
    });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during detailed event analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { event_id } = await request.json();

    if (!event_id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const { eventData, structuredData, scrapedData } = await processEvent(event_id);

    return NextResponse.json({
      success: true,
      event_id: event_id,
      event_title: eventData.title,
      query_used: eventData.query,
      data: structuredData,
      articles_scraped: structuredData.sources.length,
      images_found: structuredData.images.length,
      sources_analyzed: [...new Set(scrapedData.articles.map(a => a.source))].join(', '),
      details_length: structuredData.details.length,
      comprehensive_analysis: true
    });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during detailed event analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}