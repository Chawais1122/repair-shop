'use client';

import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** API origin without the /api prefix — socket.io namespaces live at the server root. */
export const API_ORIGIN = new URL(API_URL).origin;

/** Absolute URL for API-relative paths such as chat attachment URLs. */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

let socket: Socket | null = null;

/** One shared connection per tab; authenticated by the httpOnly session cookie. */
export function getChatSocket(): Socket {
  if (!socket) {
    socket = io(`${API_ORIGIN}/chat`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
