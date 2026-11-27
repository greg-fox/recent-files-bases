import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump version to target version
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

// update versions.json with target version and minAppVersion from manifest.json
// (the release workflow requires an entry for every released version)
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
if (versions[targetVersion] !== minAppVersion) {
    versions[targetVersion] = minAppVersion;
    writeFileSync('versions.json', JSON.stringify(versions, null, '\t') + '\n');
}
