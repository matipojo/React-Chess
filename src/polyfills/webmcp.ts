import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';

// Installs document.modelContext when the browser has no native WebMCP.
// Does not replace ChatGPT desktop or Chrome Canary's native context.
initializeWebMCPPolyfill();
