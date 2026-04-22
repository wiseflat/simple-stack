#!/usr/bin/env node

/**
 * Extract variables from Ansible roles defaults/main.yml
 * Generates public/roles-variables-<scope>.json for documentation pages
 */

const fs = require("fs").promises;
const path = require("path");

const yaml = require("js-yaml");

function sortObjectDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectDeep);
  }

  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      sorted[key] = sortObjectDeep(value[key]);
    }
    return sorted;
  }

  return value;
}

async function main() {
  try {
    const uiNextRoot = path.resolve(__dirname, "..");
    const projectRoot = path.resolve(uiNextRoot, "..");
    const outputDir = path.join(uiNextRoot, "public");

    console.log(`📂 Project root: ${projectRoot}`);
    await fs.mkdir(outputDir, { recursive: true });
    const scopes = ["paas", "saas"];

    for (const scope of scopes) {
      const rolesDir = path.join(projectRoot, "ansible", "playbooks", scope, "roles");
      const outputFile = path.join(outputDir, `roles-variables-${scope}.json`);
      const rolesData = {};

      console.log(`\n📂 Scanning ${scope.toUpperCase()} roles directory: ${rolesDir}`);

      let roleNames = [];
      try {
        roleNames = await fs.readdir(rolesDir);
      } catch (error) {
        if (error && error.code === "ENOENT") {
          console.warn(`  ⚠ ${scope.toUpperCase()} roles directory not found, generating empty output`);
          await fs.writeFile(outputFile, JSON.stringify(rolesData, null, 2), "utf-8");
          console.log(`✅ Generated: ${outputFile}`);
          console.log(`📊 ${scope.toUpperCase()} total roles: 0`);
          continue;
        }
        throw error;
      }

      for (const roleName of roleNames.sort((a, b) => a.localeCompare(b))) {
        const defaultsPath = path.join(rolesDir, roleName, "defaults", "main.yml");

        try {
          const content = await fs.readFile(defaultsPath, "utf-8");
          const parsed = yaml.load(content);

          if (parsed && typeof parsed === "object") {
            rolesData[roleName] = sortObjectDeep(parsed);
            console.log(`  ✓ ${roleName} (${Object.keys(parsed).length} variables)`);
          } else {
            rolesData[roleName] = {};
            console.log(`  ⚠ ${roleName} (empty or invalid)`);
          }
        } catch {
          console.log(`  ✗ ${roleName} (no defaults/main.yml or parse error)`);
          rolesData[roleName] = null;
        }
      }

      await fs.writeFile(outputFile, JSON.stringify(sortObjectDeep(rolesData), null, 2), "utf-8");
      console.log(`✅ Generated: ${outputFile}`);
      console.log(`📊 ${scope.toUpperCase()} total roles: ${Object.keys(rolesData).length}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
