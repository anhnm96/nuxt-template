#!/usr/bin/env node
/**
 * Asserts that each locally authored skill is identical in `.agents/skills/` and
 * `.claude/skills/`.
 *
 * Two conventions live side by side. A skill installed from elsewhere is recorded in
 * `skills-lock.json`, lands in `.agents/skills/`, and is symlinked into `.claude/skills/`, so
 * it cannot drift. A skill written in this repo is a real directory in both trees, because
 * Claude Code reads `.claude/skills/` while a fresh clone must still carry the files — and
 * nothing keeps the two copies in step. They drift one hand-edit at a time, and the stale
 * copy is the one that gets read.
 *
 * `.agents/skills/` is canonical: `--fix` copies from there.
 *
 * Usage:
 *   node scripts/check-skill-mirrors.mjs          # report drift, exit 1
 *   node scripts/check-skill-mirrors.mjs --fix    # copy .agents/skills -> .claude/skills
 *
 * Any other argument is ignored, so lint-staged may append the staged paths.
 */
import { cpSync, existsSync, lstatSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join, relative } from 'node:path'

const AGENTS = '.agents/skills'
const CLAUDE = '.claude/skills'
const fix = process.argv.includes('--fix')

/** Skills recorded in the lock file are installed and symlinked, so they cannot drift. */
function externalSkills() {
  if (!existsSync('skills-lock.json')) return new Set()
  try {
    return new Set(Object.keys(JSON.parse(readFileSync('skills-lock.json', 'utf8')).skills ?? {}))
  } catch {
    return new Set()
  }
}

/** Every file under `dir`, as paths relative to it. */
function filesUnder(dir) {
  const out = []
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) walk(path)
      else out.push(relative(dir, path).replaceAll('\\', '/'))
    }
  }
  walk(dir)
  return out.sort()
}

function compare(name) {
  const a = join(AGENTS, name)
  const c = join(CLAUDE, name)
  const differences = []

  const inA = new Set(filesUnder(a))
  const inC = new Set(filesUnder(c))
  for (const file of inA) if (!inC.has(file)) differences.push(`missing from .claude: ${file}`)
  for (const file of inC) if (!inA.has(file)) differences.push(`missing from .agents: ${file}`)
  for (const file of inA) {
    if (!inC.has(file)) continue
    if (readFileSync(join(a, file)).equals(readFileSync(join(c, file)))) continue
    differences.push(`content differs: ${file}`)
  }
  return differences
}

const external = externalSkills()
const problems = []

for (const entry of readdirSync(AGENTS, { withFileTypes: true })) {
  const name = entry.name
  if (!entry.isDirectory() || external.has(name)) continue

  const mirror = join(CLAUDE, name)
  // A symlink is already one directory under two names; only a real copy can drift.
  if (existsSync(mirror) && lstatSync(mirror).isSymbolicLink()) continue

  if (!existsSync(mirror)) {
    problems.push(`${name}: absent from ${CLAUDE}`)
    if (fix) cpSync(join(AGENTS, name), mirror, { recursive: true })
    continue
  }

  const differences = compare(name)
  if (!differences.length) continue
  problems.push(...differences.map(d => `${name}: ${d}`))
  if (fix) {
    rmSync(mirror, { recursive: true, force: true })
    cpSync(join(AGENTS, name), mirror, { recursive: true })
  }
}

if (!problems.length) {
  console.info('OK — every local skill matches in .agents/skills and .claude/skills.')
  process.exit(0)
}

if (fix) {
  console.info(`Synced ${CLAUDE} from ${AGENTS}:`)
  for (const problem of problems) console.info(`  ${problem}`)
  console.info('Stage the result before committing.')
  process.exit(0)
}

console.error('Skill copies have drifted:')
for (const problem of problems) console.error(`  ${problem}`)
console.error('\nRun `node scripts/check-skill-mirrors.mjs --fix` to copy .agents/skills over .claude/skills.')
process.exit(1)
