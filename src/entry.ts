import { detectKomga } from './komga';
import { KomgaClient } from './komga';
import { GMTransport } from './transport';
import { createRegistry } from './providers';
import { Writer } from './writer';
import { Panel } from './ui';
import { createCatalogExtension } from './catalog-extension';
declare function GM_registerMenuCommand(name: string, action: () => void): unknown;
function activate(): boolean {
  const deployment = detectKomga(document, location);
  if (!deployment) return false;
  const transport = new GMTransport(), registry = createRegistry(transport), client = new KomgaClient(deployment);
  const writer = new Writer(client, transport);
  const catalog = createCatalogExtension();
  const launch = () => {
    if (!detectKomga(document, location)) return;
    if (document.getElementById('komga-metadata-panel')) return;
    new Panel(registry, client, writer).mount(catalog);
  };
  window.addEventListener('pagehide', () => {
    void Promise.resolve(catalog.dispose()).catch(error => console.error('Catalog cleanup failed', error));
  }, { once: true });
  GM_registerMenuCommand('元数据：当前系列', launch);
  const host = document.createElement('div');
  host.id = 'komga-metadata-launcher';
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147482999';
  const shadow = host.attachShadow({ mode: 'open' }), button = document.createElement('button');
  button.textContent = '元数据'; button.style.cssText = 'font:14px system-ui;padding:8px 14px;cursor:pointer;border:1px solid #888;border-radius:6px;background:#fff;color:#222';
  button.addEventListener('click', launch); shadow.append(button); document.body.append(host);
  return true;
}
if (!activate()) {
  const observer = new MutationObserver(() => { if (activate()) observer.disconnect(); });
  observer.observe(document.documentElement, { subtree: true, childList: true });
  setTimeout(() => observer.disconnect(), 30000);
}
