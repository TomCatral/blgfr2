// @ts-ignore
import mdns from 'multicast-dns';

export function startMdnsBroadcaster(
  getIp: () => string,
  hostnames: string[] = ['blgf.local', 'blgfdts.local', 'server.local'],
) {
  try {
    const responder = mdns();
    responder.on('query', (query: any) => {
      const answers: any[] = [];
      const currentIp = getIp();
      if (!currentIp || currentIp === 'localhost' || currentIp === '127.0.0.1') return;

      for (const q of query?.questions || []) {
        const name = String(q.name || '').toLowerCase();
        if (hostnames.includes(name) && (q.type === 'A' || q.type === 'ANY')) {
          answers.push({
            name: q.name,
            type: 'A',
            ttl: 120,
            data: currentIp,
          });
        }
      }
      if (answers.length > 0) {
        responder.respond({ answers });
      }
    });

    responder.on('error', (err: any) => {
      if (err?.code !== 'EADDRINUSE') {
        // Silently tolerate transient local network socket issues
      }
    });

    return responder;
  } catch (err: any) {
    console.warn('[mDNS] Could not initialize mDNS responder for custom domains:', err?.message || err);
    return null;
  }
}
