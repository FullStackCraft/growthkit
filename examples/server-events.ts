import type { Store } from './ingestion';
/** Invoke from verified account creation, not a browser claim. Stable source ID makes retries safe. */
export async function signupCompleted(store: Store, productName: string, userId: string, createdAt: string) {
  await store.ingest({ product_name: productName, event_id: crypto.randomUUID(), name: 'signup_completed',
    visitor_id: null, session_id: null, user_id: userId, occurred_at: createdAt, page_url: null,
    attribution: {}, properties: {}, origin: 'server', source_event_id: `signup:${userId}` });
}
