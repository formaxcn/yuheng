import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const [major, minor] = packageJson.version.split('.');

const now = new Date();
const year = now.getFullYear().toString().slice(-2);
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const day = now.getDate().toString().padStart(2, '0');
const shortTimestamp = `${year}${month}${day}`;

const isBuild = process.argv.includes('--build') || process.env.BUILD === 'true';
let version = `${major}.${minor}.${shortTimestamp}`;

if (isBuild) {
  let commitHash = process.env.GITHUB_SHA;
  if (commitHash) {
    commitHash = commitHash.slice(0, 7);
  } else {
    try {
      commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      commitHash = 'unknown';
    }
  }
  version = `${version}-${commitHash}`;
}

const versionModulePath = path.join(__dirname, '..', 'lib', 'version.ts');
const versionModuleContent = `export const VERSION = '${version}';
`;

fs.writeFileSync(versionModulePath, versionModuleContent);

console.log(`Generated version: ${version}`);
