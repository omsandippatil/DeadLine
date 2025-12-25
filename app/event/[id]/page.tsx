import { notFound } from 'next/navigation';
import ImageSlider from '../../components/ImageSlider';
import EventDetailsComponent from '../../components/EventDetails';
import SourcesComponent from '../../components/Sources';

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

interface EventDetailsResponse {
  success: boolean;
  data: EventDetails;
}

interface EventUpdatesResponse {
  success: boolean;
  data: EventUpdate[];
  count: number;
}

async function getEventDetails(id: string): Promise<EventDetails | null> {
  const apiKey = process.env.API_SECRET_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  if (!apiKey) {
    console.error('API_SECRET_KEY not found in environment variables');
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/api/get/details?event_id=${id}&api_key=${apiKey}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch event details: ${response.status} ${response.statusText}`);
      return null;
    }

    const result: EventDetailsResponse = await response.json();
    
    if (!result.success) {
      console.error('API returned success: false');
      return null;
    }

    if (result.data && !Array.isArray(result.data.images)) {
      result.data.images = [];
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
}

async function getEventUpdates(id: string): Promise<EventUpdate[]> {
  const apiKey = process.env.API_SECRET_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  if (!apiKey) {
    console.error('API_SECRET_KEY not found in environment variables');
    return [];
  }

  try {
    const response = await fetch(`${baseUrl}/api/get/updates?event_id=${id}&api_key=${apiKey}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch event updates: ${response.status} ${response.statusText}`);
      return [];
    }

    const result: EventUpdatesResponse = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching event updates:', error);
    return [];
  }
}

// Helper function to parse and highlight text between * *
function parseHighlightedText(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      const content = part.slice(1, -1);
      return `<span class="bg-white text-black px-1">${content}</span>`;
    }
    return part;
  }).join('');
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  if (!id || isNaN(Number(id))) {
    console.error('Invalid event ID:', id);
    notFound();
  }

  const [eventDetails, eventUpdates] = await Promise.all([
    getEventDetails(id),
    getEventUpdates(id)
  ]);

  if (!eventDetails) {
    console.error('Event details not found for ID:', id);
    notFound();
  }

  const safeEventDetails = {
    ...eventDetails,
    images: Array.isArray(eventDetails.images) ? eventDetails.images : [],
    sources: Array.isArray(eventDetails.sources) ? eventDetails.sources : [],
    location: eventDetails.location || 'Unknown Location',
    details: eventDetails.details || 'No details available',
  };

  const safeEventUpdates = Array.isArray(eventUpdates) ? eventUpdates : [];

  return (
    <div className="min-h-screen bg-gray-50 scroll-smooth" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header className="border-b border-black bg-white sticky top-0 z-50">
        <div className="max-w-full mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <a href="/" className="text-xl font-black tracking-tight uppercase text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              DEADLINE
            </a>
            <nav className="flex space-x-4">
              <a href="#overview" className="text-xs font-normal text-black hover:underline transition-all duration-300 font-mono">Overview</a>
              <a href="#sources" className="text-xs font-normal text-black hover:underline transition-all duration-300 font-mono">Sources</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-black text-white py-8 border-b-2 border-black">
        <div className="max-w-full mx-auto px-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-white text-black text-xs uppercase tracking-wider border border-black font-mono">
                {new Date(safeEventDetails.created_at || Date.now()).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            <h1 
              className="text-2xl md:text-3xl font-bold leading-tight tracking-tight text-white text-justify" 
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              dangerouslySetInnerHTML={{ __html: parseHighlightedText(safeEventDetails.details.split('.')[0] || `Event at ${safeEventDetails.location}`) }}
            />
            <p className="text-base text-white text-justify font-mono">
              {safeEventDetails.location}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-full mx-auto px-6 py-8">
        <div className="max-w-none">
          <ImageSlider images={safeEventDetails.images} />
          <div id="overview">
            <EventDetailsComponent 
              eventDetails={safeEventDetails} 
              eventUpdates={safeEventUpdates} 
            />
          </div>
          <div id="sources">
            <SourcesComponent sources={safeEventDetails.sources} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-6 border-t-2 border-black">
        <div className="max-w-full mx-auto px-6 text-center">
          <h2 className="text-lg font-black tracking-tight uppercase mb-2 text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            DEADLINE
          </h2>
          <p className="text-white text-sm font-mono">
            A Mueseum of temporary truths.
          </p>
        </div>
      </footer>
    </div>
  );
}