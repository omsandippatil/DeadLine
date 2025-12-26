"use client";

import { useState, useEffect } from 'react';

interface SourcesProps {
  sources: string[];
}

interface SourceData {
  title?: string;
  favicon?: string;
  loading: boolean;
  error?: boolean;
}

function SourcePreview({ url }: { url: string }) {
  const [sourceData, setSourceData] = useState<SourceData>({ loading: true });

  useEffect(() => {
    let isMounted = true;

    const fetchSourceData = async () => {
      try {
        setSourceData({ loading: true });
        
        const proxyUrls = [
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          `https://corsproxy.io/?${encodeURIComponent(url)}`
        ];
        
        let htmlContent = '';
        let success = false;
        
        for (const proxyUrl of proxyUrls) {
          try {
            const response = await fetch(proxyUrl);
            if (response.ok) {
              const data = await response.json();
              htmlContent = data.contents || data;
              success = true;
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        if (!isMounted) return;
        
        if (!success) {
          throw new Error('Failed to fetch');
        }
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        const title = 
          doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
          doc.querySelector('title')?.textContent ||
          new URL(url).hostname.replace('www.', '');
        
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        
        if (isMounted) {
          setSourceData({
            loading: false,
            title: title.trim(),
            favicon
          });
        }
        
      } catch (error) {
        if (!isMounted) return;
        
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname;
          setSourceData({
            loading: false,
            error: true,
            title: domain.replace('www.', ''),
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
          });
        } catch {
          setSourceData({
            loading: false,
            error: true,
            title: 'Invalid URL'
          });
        }
      }
    };

    if (url) {
      fetchSourceData();
    }

    return () => {
      isMounted = false;
    };
  }, [url]);

  return (
    <div className="bg-white border border-black p-3 sm:p-4 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 transform hover:-translate-y-0.5">
      {sourceData.loading ? (
        <div className="animate-pulse flex flex-col items-center space-y-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-full border border-black"></div>
          <div className="h-3 bg-gray-300 w-20 sm:w-24 border border-black"></div>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-2">
          {sourceData.favicon && (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-black overflow-hidden bg-white flex items-center justify-center">
              <img 
                src={sourceData.favicon} 
                alt="" 
                className="w-5 h-5 sm:w-6 sm:h-6"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <p className="text-black text-xs sm:text-sm text-center font-mono leading-tight px-1">
            {sourceData.title}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SourcesComponent({ sources }: SourcesProps) {
  if (!sources || sources.length === 0) return null;

  const validSources = sources.filter(source => {
    try {
      new URL(source);
      return true;
    } catch {
      return false;
    }
  });

  if (validSources.length === 0) return null;

  return (
    <section className="mb-6">
      <h3 className="text-base font-bold mb-3 sm:mb-4 text-black border-b-2 border-black pb-2">
        Sources
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {validSources.map((source, index) => (
          <SourcePreview key={`${source}-${index}`} url={source} />
        ))}
      </div>
    </section>
  );
}