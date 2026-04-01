#!/usr/bin/env node
/**
 * Validates that pnpm-lock.yaml is in sync with package.json
 * Exits with code 1 if lockfile is outdated
 */

const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

const rootDir = path.join(__dirname, '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const lockfilePath = path.join(rootDir, 'pnpm-lock.yaml')

try {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

  // Read pnpm-lock.yaml
  const lockfileContent = fs.readFileSync(lockfilePath, 'utf8')
  const lockfile = YAML.parse(lockfileContent)

  if (!lockfile) {
    console.error('❌ Error: pnpm-lock.yaml is empty or invalid')
    process.exit(1)
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.optionalDependencies,
  }

  if (!allDeps || Object.keys(allDeps).length === 0) {
    console.log('✅ No dependencies to check')
    process.exit(0)
  }

  // Check if all dependencies exist in lockfile
  const missingDeps = []
  const lockfilePackages = lockfile.packages || {}

  for (const [dep, version] of Object.entries(allDeps)) {
    // pnpm-lock.yaml uses keys like "package-name@version"
    // We need to check if the package exists in the lockfile at all
    const depEntries = Object.keys(lockfilePackages).filter(
      (key) => key.startsWith(`${dep}@`) || key === dep,
    )

    if (depEntries.length === 0) {
      missingDeps.push(`${dep}@${version}`)
    }
  }

  if (missingDeps.length > 0) {
    console.error('❌ Error: pnpm-lock.yaml is out of sync with package.json')
    console.error('\nMissing dependencies in lockfile:')
    missingDeps.forEach((dep) => {
      console.error(`  - ${dep}`)
    })
    console.error('\nFix: Run "pnpm install" to update the lockfile')
    process.exit(1)
  }

  console.log('✅ pnpm-lock.yaml is in sync with package.json')
  process.exit(0)
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`❌ Error: File not found - ${error.path}`)
  } else {
    console.error('❌ Error:', error.message)
  }
  process.exit(1)
}
