import publicConfig from './lib/firebase-web-config.cjs';
const {readPublicConfig, safeLiteral} = publicConfig;
export default async function firebaseConfig(request) {
  if (request.method !== 'GET') return new Response('Method not allowed', {status:405});
  const headers = { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
  try {
    const config = readPublicConfig(process.env);
    return new Response('window.NOMERA_FIREBASE_WEB_CONFIG = ' + safeLiteral(config) + ';', {status:200, headers});
  } catch (e) {
    // Safe diagnostic; no environment values or secrets are included in response.
    console.warn('Firebase web configuration invalid:', e.message);
    return new Response('window.NOMERA_FIREBASE_CONFIG_ERROR = "Новый Firebase не настроен. Проверьте переменные в Netlify.";', {status:200, headers});
  }
}
