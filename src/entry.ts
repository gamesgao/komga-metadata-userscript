import { detectKomga } from './komga';
import { KomgaClient } from './komga';
import { GMTransport } from './transport';
import { createRegistry } from './providers';
import { Writer } from './writer';
import { Panel } from './ui';
import { createCatalogExtension } from './catalog-extension';
import { icon } from './ui-style';
import { EhTagTranslation } from './eh-tag-translation';
declare function GM_registerMenuCommand(name: string, action: () => void): unknown;
function activate(): boolean {
  const deployment = detectKomga(document, location);
  if (!deployment) return false;
  const transport = new GMTransport(), registry = createRegistry(transport), client = new KomgaClient(deployment);
  const writer = new Writer(client, transport);
  const translation = new EhTagTranslation(transport);
  const catalog = createCatalogExtension();
  const launch = () => {
    if (!detectKomga(document, location)) return;
    if (document.getElementById('komga-metadata-panel')) return;
    new Panel(registry, client, writer, translation).mount(catalog);
  };
  window.addEventListener('pagehide', () => {
    void Promise.resolve(catalog.dispose()).catch(error => console.error('Catalog cleanup failed', error));
  }, { once: true });
  GM_registerMenuCommand('元数据：当前系列', launch);
  const host = document.createElement('div');
  host.id = 'komga-metadata-launcher';
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147482999';
  const shadow = host.attachShadow({ mode: 'open' }), button = document.createElement('button');
  button.textContent = '元数据'; button.prepend(icon('layers'));
  const style = document.createElement('style');
  style.textContent = 'button{display:flex;align-items:center;gap:8px;font:500 13px system-ui;padding:11px 16px;cursor:pointer;border:1px solid #ffffff30;border-radius:12px;background:#4f46e5;color:#fff;box-shadow:0 6px 24px #15133d33}button:hover{background:#4338ca}button:focus-visible{outline:2px solid #a6a0ff;outline-offset:3px}svg{width:18px;height:18px}';
  button.addEventListener('click', launch); shadow.append(style, button); document.body.append(host);
  return true;
}
if (!activate()) {
  const observer = new MutationObserver(() => { if (activate()) observer.disconnect(); });
  observer.observe(document.documentElement, { subtree: true, childList: true });
  setTimeout(() => observer.disconnect(), 30000);
}
