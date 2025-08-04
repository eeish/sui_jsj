#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')
const CONTRACTS_DIR = join(PROJECT_ROOT, 'contracts', 'todo')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function error(message) {
  log(`❌ ${message}`, 'red')
}

function success(message) {
  log(`✅ ${message}`, 'green')
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue')
}

function step(message) {
  log(`\n🔄 ${message}`, 'cyan')
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      cwd: options.cwd || PROJECT_ROOT,
      ...options 
    })
    return result?.trim()
  } catch (err) {
    error(`Command failed: ${command}`)
    error(err.message)
    process.exit(1)
  }
}

function main() {
  log('🧪 Testing Sui Todo Smart Contract', 'cyan')
  log('=' .repeat(40), 'cyan')
  
  // Check if contracts directory exists
  if (!existsSync(CONTRACTS_DIR)) {
    error(`Contracts directory not found: ${CONTRACTS_DIR}`)
    process.exit(1)
  }
  
  step('Building contract...')
  execCommand('sui move build', { cwd: CONTRACTS_DIR })
  success('Contract built successfully')
  
  step('Running Move tests...')
  execCommand('sui move test', { cwd: CONTRACTS_DIR })
  success('All tests passed!')
  
  step('Checking code formatting...')
  execCommand('sui move fmt --check', { cwd: CONTRACTS_DIR })
  success('Code formatting is correct')
  
  log('\n🎉 All contract tests passed!', 'green')
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}