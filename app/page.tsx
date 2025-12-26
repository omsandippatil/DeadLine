import Image from 'next/image';
import Link from 'next/link';
import { EventsClient } from './events-client';
import { sql } from '@vercel/postgres';

interface Event {
  event_id: number;
  title: string;
  image_url: string | null;
  status: string;
  tags: string[] | null;
  query: string | null;
  summary: string | null;
  last_updated: string | null;
  incident_date: string | null;
}

interface EventsResponse {
  events: Event[];
}

async function getEvents(): Promise<Event[]> {
  try {
    // Fetch directly from database during build
    const { rows } = await sql`
      SELECT 
        event_id,
        title,
        image_url,
        status,
        tags,
        query,
        summary,
        last_updated,
        incident_date
      FROM events
      ORDER BY incident_date DESC NULLS LAST, last_updated DESC
    `;
    
    return rows as Event[];
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

// Only revalidate on-demand via API call
export const revalidate = false;

function formatDate(dateString: string | null) {
  if (!dateString) return 'NO DATE';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).toUpperCase();
}

function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case 'injustice':
      return 'INJUSTICE';
    case 'resolved':
      return 'JUSTICE';
    case 'pending':
      return 'DEVELOPING';
    default:
      return status.toUpperCase();
  }
}

export default async function DeadlineEventsPage() {
  const events = await getEvents();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Title */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-black mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            DEADLINE
          </h1>
          <p className="text-lg font-normal text-black tracking-wide font-mono">
            Museum of Temporary Truths
          </p>
        </div>
      </section>

      {/* Client Component for Filtering and Infinite Scroll */}
      <EventsClient initialEvents={events} />

      {/* Footer */}
      <footer className="border-t border-black bg-white mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h3 className="text-2xl font-black tracking-tight mb-4 text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>DEADLINE</h3>
            <p className="text-sm font-normal text-black tracking-wide font-mono">
              Museum of Temporary Truths
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
