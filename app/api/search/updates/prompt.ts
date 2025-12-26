interface GoogleSearchResult {
  title: string;
  snippet: string;
  link: string;
  publishedDate?: string;
  fullContent?: string;
}

export function buildUpdateAnalysisPrompt(
  query: string, 
  searchResults: GoogleSearchResult[], 
  lastUpdateDate: string
): string {
  const searchContent = searchResults.map((result, index) => 
    `Result ${index + 1}:
Title: ${result.title}
Snippet: ${result.snippet}
Link: ${result.link}
Published: ${result.publishedDate || 'Date not available'}
Full Article Content:
${result.fullContent || 'Content not available'}
---`
  ).join('\n\n');

  return `Analyze developments for: "${query}" occurring AFTER ${lastUpdateDate}

Return ONLY valid JSON. Start with { and end with }.

Expected JSON Structure:
{
  "has_new_updates": true,
  "updates": [
    {
      "date": "YYYY-MM-DD",
      "title": "Concise headline summarizing the development",
      "description": "Comprehensive narrative covering all key details, context, implications, and specific data points from the article"
    }
  ]
}

CRITICAL REQUIREMENTS:

1. DATE FILTERING:
   - Read ALL full article content provided
   - Extract ONLY content published AFTER ${lastUpdateDate}
   - If NO content after ${lastUpdateDate} exists, return: {"has_new_updates": false, "updates": []}

2. DATE GROUPING:
   - Group findings by publication date
   - Create SEPARATE update object for EACH distinct date
   - Each update represents ONE specific date only
   - Sort updates chronologically from oldest to newest

3. DATE FIELD:
   - Must be YYYY-MM-DD format
   - Must match the article's actual publication date
   - Do NOT use generic dates or date ranges

4. TITLE FIELD:
   - Must be newsworthy and specific to that date's development
   - Should capture the most significant aspect of the update
   - Be concise but informative
   - Do NOT use generic titles like "Update for [Date]"

5. DESCRIPTION FIELD:
   - Write a comprehensive narrative covering that date's developments
   - Include specific data, facts, numbers, names, and timestamps
   - Provide context and explain significance
   - Discuss implications and potential impact
   - Synthesize information from full article content published on that date
   - Write in clear, professional prose
   - Aim for thoroughness while maintaining readability

6. CONTENT REQUIREMENTS:
   - Do NOT combine multiple dates into one update
   - Do NOT include information from before ${lastUpdateDate}
   - Focus on changes, new developments, and specific events
   - Use exact numbers, complete names, precise data points
   - Include specific timestamps when available
   - Properly escape quotes with backslash in JSON

7. QUALITY STANDARDS:
   - Prioritize accuracy over quantity
   - Ensure each update adds meaningful information
   - Avoid speculation or assumptions
   - Base all content on provided article text
   - Maintain journalistic objectivity

LAST UPDATE DATE: ${lastUpdateDate}

SEARCH RESULTS TO ANALYZE:
${searchContent}

Return ONLY the JSON object. No preamble, no explanation, just the JSON.`;
}