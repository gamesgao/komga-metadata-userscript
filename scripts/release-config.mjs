export const repository = 'gamesgao/komga-metadata-userscript';
export const userFilename = 'komga-metadata.user.js';
export const metaFilename = 'komga-metadata.meta.js';
export const latestBase = `https://github.com/${repository}/releases/latest/download/`;

export function validateVersion(version) {
  if (typeof version !== 'string' || version !== version.trim() || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) ||
      !version.split('.').every(n => Number.isSafeInteger(Number(n)))) {
    throw new Error('Release version must be a stable X.Y.Z version from package.json');
  }
  return version;
}
export function assetBase(version, release = false) {
  const ref = release ? `v${validateVersion(version)}` : 'main';
  return `https://raw.githubusercontent.com/${repository}/${ref}/dist/catalog/`;
}
export function releaseDecision(existing, tagCommit, commit) {
  // Published versions are immutable to this pipeline, including subsequent
  // main commits which deliberately keep the same package version.
  if (existing && !existing.draft) return false;
  if (tagCommit && tagCommit !== commit) throw new Error('Existing version tag points to another commit');
  if (existing && existing.target_commitish !== commit) throw new Error('Draft belongs to another commit');
  return true;
}
export function newerVersion(a, b) {
  const left = validateVersion(a).split('.').map(Number);
  const right = validateVersion(b).split('.').map(Number);
  for (let i=0;i<3;i++) if (left[i] !== right[i]) return left[i] > right[i];
  return false;
}
