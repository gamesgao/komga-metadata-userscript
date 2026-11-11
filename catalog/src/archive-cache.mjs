import { catalogDirectory, storageBackend } from './storage.mjs';
const ids = ['bangumi','ehentai','mangabaka','bookwalker'];
function check(id) { if (!ids.includes(id)) throw new Error('不支持的来源'); }
async function read(directory, name) { return JSON.parse(await (await (await directory.getFileHandle(name)).getFile()).text()); }
async function remove(directory, name) { await directory.removeEntry(name).catch(e => { if (e.name !== 'NotFoundError') throw e; }); }
function valid(info) { return info?.version === 1 && typeof info.name === 'string' && /^[a-f0-9-]+-[^/\\]+$/.test(info.name) && Number.isSafeInteger(info.bytes) && info.bytes > 0; }
export class ArchiveCache {
  async get(id) {
    check(id);
    try {
      const directory = await catalogDirectory('komga-catalog-download', false);
      const info = await read(directory, `ready-${id}.json`);
      if (!valid(info)) throw new Error('原始档案保存记录无效');
      const file = await (await directory.getFileHandle(info.name)).getFile();
      if (file.size !== info.bytes) throw new Error('原始档案大小不符，请清除后重新下载');
      return { file, storageName: info.name, savedAt: info.savedAt };
    } catch (e) { if (e.name === 'NotFoundError') return undefined; throw e; }
  }
  async save(id, archive, url) {
    check(id);
    const directory = await catalogDirectory('komga-catalog-download');
    const info = { version: 1, name: archive.storageName, bytes: archive.file.size, savedAt: Date.now(), url };
    if (!valid(info)) throw new Error('原始档案不能持久保存');
    let previous;
    try { previous = await read(directory, `ready-${id}.json`); } catch (e) { if (e.name !== 'NotFoundError' && !(e instanceof SyntaxError)) throw e; }
    const out = await (await directory.getFileHandle(`ready-${id}.json`, { create: true })).createWritable();
    try { await out.write(JSON.stringify(info)); await out.close(); }
    catch (e) { await out.abort().catch(() => {}); throw e; }
    if (valid(previous) && previous.name !== info.name) await remove(directory, previous.name).catch(() => {});
    return { ...archive, savedAt: info.savedAt };
  }
  async discard(id) {
    check(id);
    let directory, info;
    try { directory = await catalogDirectory('komga-catalog-download', false); info = await read(directory, `ready-${id}.json`); }
    catch (e) { if (e.name === 'NotFoundError') return; throw e; }
    if (!valid(info)) throw new Error('原始档案保存记录无效，未删除任何档案');
    await remove(directory, info.name);
    await remove(directory, `ready-${id}.json`);
  }
}
export async function removeSavedCatalog(id) {
  check(id);
  try {
    const directory = await catalogDirectory('komga-catalog-build', false);
    const info = await read(directory, `active-${id}.json`);
    if (info.provider !== id || !/^output-[\w-]+\.sqlite$/.test(info.name)) throw new Error('保存记录无效');
    await remove(directory, `active-${id}.json`);
    await remove(directory, info.name);
  } catch (e) { if (e.name !== 'NotFoundError') throw e; }
}
export async function storageUsage() {
  let usage, quota, owned = 0;
  if (storageBackend() === 'legacy' && navigator.webkitTemporaryStorage?.queryUsageAndQuota) {
    ({ usage, quota } = await new Promise((ok, no) => navigator.webkitTemporaryStorage.queryUsageAndQuota((usage, quota) => ok({usage, quota}), no)));
  } else if (navigator.storage?.estimate) ({ usage, quota } = await navigator.storage.estimate());
  for (const name of ['komga-catalog-build','komga-catalog-download']) {
    try {
      const directory = await catalogDirectory(name, false);
      for await (const [, handle] of directory.entries()) {
        if (handle.kind === 'file') owned += (await handle.getFile()).size;
      }
    } catch (e) { if (e.name !== 'NotFoundError') throw e; }
  }
  return { owned, usage, quota };
}
