import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith('/tools/')) {
    const requiredKey = process.env.INTERNAL_ACCESS_KEY || '';
    // In local/dev or when no key is set, bypass protection
    if (process.env.NODE_ENV !== 'production' || !requiredKey) {
      return NextResponse.next();
    }
    const headerKey = request.headers.get('x-internal-key') || '';
    const queryKey = searchParams.get('key') || '';

    if (!requiredKey || (headerKey !== requiredKey && queryKey !== requiredKey)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/tools/:path*'],
};


