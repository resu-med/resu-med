import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    console.log('🔧 DEBUG WEBHOOK - Signature check:', signature ? 'Present' : 'Missing');
    console.log('🔧 DEBUG WEBHOOK - Body length:', body.length);
    console.log('🔧 DEBUG WEBHOOK - Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));

    // Parse the webhook without signature verification for debugging
    try {
      const event = JSON.parse(body);
      console.log('🔧 DEBUG WEBHOOK - Event type:', event.type);
      console.log('🔧 DEBUG WEBHOOK - Event ID:', event.id);
      console.log('🔧 DEBUG WEBHOOK - Event data:', JSON.stringify(event.data.object, null, 2).substring(0, 1000));

      return NextResponse.json({
        received: true,
        eventType: event.type,
        eventId: event.id
      });
    } catch (parseErr) {
      console.error('🔧 DEBUG WEBHOOK - Failed to parse:', parseErr);
      return NextResponse.json(
        { error: 'Failed to parse webhook body' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('🔧 DEBUG WEBHOOK - Error:', error);
    return NextResponse.json(
      { error: 'Debug webhook failed' },
      { status: 500 }
    );
  }
}