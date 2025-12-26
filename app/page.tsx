import Image from 'next/image';
import Link from 'next/link';
import { EventsClient } from './events-client';

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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const response = await fetch(`${baseUrl}/api/get/events`, {
    next: { 
      tags: ['events-list'],
      revalidate: 3600 // Cache for 1 hour
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }

  const data: EventsResponse = await response.json();
  return data.events;
}

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

       <EventsClient initialEvents={events} />

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
