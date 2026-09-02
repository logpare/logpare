import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// The search dialog in fumadocs-ui calls this route with `?query=` and expects the
// per-query result array that `GET` returns. `staticGET` instead serialises the whole
// Orama index for a static-export client, which the default dialog does not use — it
// tried to `.map()` that object and crashed the page on the first keystroke.
export const { GET } = createFromSource(source);
