import { Registry } from '../model';
import { SourceTransport, type Transport } from '../transport';
import { Bangumi, MangaUpdates, MangaBaka, MangaDex, AniList, MAL, ComicVine } from './api';
import { EHentai, HTMLSource } from './html';
export function createRegistry(transport: Transport): Registry {
  const registry = new Registry();
  registry.register(new Bangumi(new SourceTransport(transport, 400)));
  registry.register(new MangaUpdates(new SourceTransport(transport, 1000)));
  registry.register(new MangaBaka(new SourceTransport(transport, 500)));
  registry.register(new MangaDex(new SourceTransport(transport, 300)));
  registry.register(new AniList(new SourceTransport(transport, 1000)));
  registry.register(new EHentai(new SourceTransport(transport, 1500)));
  registry.register(new MAL(new SourceTransport(transport, 1000)));
  registry.register(new ComicVine(new SourceTransport(transport, 2000)));
  for (const id of ['viz', 'yenpress', 'webtoons'] as const) registry.register(new HTMLSource(id, new SourceTransport(transport, 1000)));
  return registry;
}
