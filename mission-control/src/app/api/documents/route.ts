import { NextResponse } from 'next/server';
import { getAllDocuments } from '@/lib/documents';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const documents = getAllDocuments();
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
