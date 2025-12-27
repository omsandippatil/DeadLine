import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tags } = body;

    if (!tags || !Array.isArray(tags)) {
      return NextResponse.json(
        { success: false, message: 'Invalid tags parameter' },
        { status: 400 }
      );
    }

    for (const tag of tags) {
      if (tag.startsWith('event-') && !tag.includes('details') && !tag.includes('updates')) {
        const eventId = tag.replace('event-', '');
        revalidatePath(`/event/${eventId}`, 'page');
      }
    }
    
    revalidatePath('/', 'layout');

    return NextResponse.json({
      success: true,
      tags,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Internal revalidation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}