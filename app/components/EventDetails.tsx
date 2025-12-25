"use client";

import { useState, useEffect } from 'react';

interface EventDetails {
  event_id: number;
  location: string;
  details: string;
  accused: string;
  victims: string;
  timeline: string;
  sources: string[];
  images: string[];
  created_at: string;
  updated_at: string;
}

interface EventUpdate {
  update_id: number;
  event_id: number;
  title: string;
  description: string;
  update_date: string;
}

interface EventDetailsProps {
  eventDetails: EventDetails;
  eventUpdates: EventUpdate[];
}

// Skeleton Component
function Skeleton() {
  return (
    <div className="animate-pulse">
      {/* Overview Skeleton */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-white p-4 sm:p-6 border border-black">
          <div className="h-5 bg-gray-300 w-24 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 w-full"></div>
            <div className="h-3 bg-gray-200 w-full"></div>
            <div className="h-3 bg-gray-200 w-3/4"></div>
          </div>
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white p-3 sm:p-4 border border-black">
          <div className="h-4 bg-gray-300 w-32 mb-3"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-100 border border-black"></div>
            <div className="h-8 bg-gray-100 border border-black"></div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 border border-black">
          <div className="h-4 bg-gray-300 w-32 mb-3"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-100 border border-black"></div>
            <div className="h-8 bg-gray-100 border border-black"></div>
          </div>
        </div>
      </div>

      {/* Timeline & Updates Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <div className="h-5 bg-gray-300 w-40 mb-3"></div>
          <div className="space-y-3">
            <div className="h-24 bg-white border border-black"></div>
            <div className="h-24 bg-white border border-black"></div>
          </div>
        </div>
        <div>
          <div className="h-5 bg-gray-300 w-40 mb-3"></div>
          <div className="space-y-3">
            <div className="h-24 bg-white border border-black"></div>
            <div className="h-24 bg-white border border-black"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventDetailsComponent({ eventDetails, eventUpdates }: EventDetailsProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const parseJsonString = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  };

  // Parse text and highlight content between * *
  const parseHighlightedText = (text: string) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        const content = part.slice(1, -1);
        return (
          <span key={index} className="bg-black text-white px-1">
            {content}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const accused = parseJsonString(eventDetails.accused);
  const victims = parseJsonString(eventDetails.victims);
  const timeline = parseJsonString(eventDetails.timeline);

  // Parse timeline event to extract date and description
  const parseTimelineEvent = (event: any) => {
    if (typeof event === 'string') {
      const colonIndex = event.indexOf(':');
      if (colonIndex !== -1) {
        return {
          date: event.substring(0, colonIndex).trim(),
          description: event.substring(colonIndex + 1).trim()
        };
      }
      return { date: '', description: event };
    }
    return event;
  };

  if (loading) {
    return <Skeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Overview */}
      <article className="mb-4 sm:mb-6">
        <div className="bg-white p-4 sm:p-6 border border-black">
          <h2 className="text-base sm:text-lg font-bold mb-3 uppercase tracking-tight text-black" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            Overview
          </h2>
          <p className="text-black text-xs sm:text-sm leading-relaxed text-justify font-mono">
            {parseHighlightedText(eventDetails.details)}
          </p>
        </div>
      </article>

      {/* Key Information Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {accused.length > 0 && (
          <div className="bg-white p-3 sm:p-4 border border-black">
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight border-b-2 border-black pb-2 mb-3 text-black" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Accused Parties
            </h3>
            <div className="space-y-2">
              {accused.map((person: string, index: number) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-100 border border-black">
                  <div className="w-1.5 h-1.5 bg-black flex-shrink-0"></div>
                  <span className="text-black text-xs font-mono">{parseHighlightedText(person)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {victims.length > 0 && (
          <div className="bg-white p-3 sm:p-4 border border-black">
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight border-b-2 border-black pb-2 mb-3 text-black" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Affected Parties
            </h3>
            <div className="space-y-2">
              {victims.map((victim: string, index: number) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-100 border border-black">
                  <div className="w-1.5 h-1.5 bg-black flex-shrink-0"></div>
                  <span className="text-black text-xs font-mono">{parseHighlightedText(victim)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Timeline and Updates Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Timeline */}
        {timeline.length > 0 && (
          <section>
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight mb-3 border-b-2 border-black pb-2 text-black" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Timeline of Events
            </h3>
            <div className="relative">
              <div className="absolute left-3 sm:left-4 top-0 bottom-0 w-0.5 bg-black"></div>
              <div className="space-y-3">
                {timeline.map((event: any, index: number) => {
                  const parsedEvent = parseTimelineEvent(event);
                  return (
                    <div key={index} className="relative pl-8 sm:pl-10">
                      <div className="absolute left-1.5 sm:left-2.5 top-2 w-3 h-3 bg-black border-2 border-white"></div>
                      <div className="bg-white p-3 border border-black">
                        {parsedEvent.date && (
                          <div className="mb-2">
                            <span className="inline-block px-2 py-1 bg-black text-white text-xs uppercase tracking-wide font-mono">
                              {parsedEvent.date}
                            </span>
                          </div>
                        )}
                        <p className="text-black text-xs leading-relaxed text-justify font-mono">
                          {parseHighlightedText(parsedEvent.description)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Recent Updates */}
        {eventUpdates.length > 0 && (
          <section>
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight mb-3 border-b-2 border-black pb-2 text-black" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Recent Updates
            </h3>
            <div className="space-y-3">
              {eventUpdates.map((update) => (
                <article key={update.update_id} className="bg-white p-3 border border-black">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-black font-mono flex-1">{parseHighlightedText(update.title)}</h4>
                    <time className="text-xs text-black bg-gray-100 px-2 py-0.5 border border-black font-mono whitespace-nowrap">
                      {new Date(update.update_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </time>
                  </div>
                  <p className="text-black text-xs leading-relaxed text-justify font-mono">
                    {parseHighlightedText(update.description)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}