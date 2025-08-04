#!/usr/bin/env node

import { spawn, execSync } from 'child_process'
import { setTimeout } from 'timers/promises'

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

function warning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function step(message) {
  log(`\n🔄 ${message}`, 'cyan')
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    })
    return result?.trim()
  } catch (err) {
    if (!options.allowFailure) {
      error(`Command failed: ${command}`)
      error(err.message)
      process.exit(1)
    }
    return null
  }
}

function checkSuiInstallation() {
  step('Checking Sui CLI installation...')
  
  const suiVersion = execCommand('sui --version', { silent: true, allowFailure: true })
  if (!suiVersion) {
    error('Sui CLI is not installed!')
    console.log('')
    info('Please install Sui CLI first:')
    console.log('  # Using cargo (recommended)')
    console.log('  cargo install --locked --git https://github.com/MystenLabs/sui.git --tag mainnet-v1.14.2 sui')
    console.log('')
    console.log('  # Or download pre-built binary')
    console.log('  curl -fLJO https://github.com/MystenLabs/sui/releases/download/mainnet-v1.14.2/sui-mainnet-v1.14.2-ubuntu-x86_64.tgz')
    console.log('  tar -xzf sui-mainnet-v1.14.2-ubuntu-x86_64.tgz')
    console.log('  sudo mv sui-mainnet-v1.14.2-ubuntu-x86_64/sui /usr/local/bin/')
    process.exit(1)
  }
  
  success(`Found Sui CLI: ${suiVersion}`)
}

function checkIfNetworkRunning() {
  try {
    // Try to connect to local network
    const result = execCommand('sui client active-env', { silent: true, allowFailure: true })
    if (result === 'local') {
      // Try to get network info to verify it's actually running
      execCommand('sui client chain-identifier', { silent: true })
      return true
    }
  } catch (err) {
    return false
  }
  return false
}

async function startLocalNetwork() {
  step('Starting local Sui network...')
  
  if (checkIfNetworkRunning()) {
    warning('Local Sui network is already running!')
    info('Current active environment: local')
    return
  }
  
  // Start the local network in background
  info('Starting local network (this may take 30-60 seconds)...')
  const suiProcess = spawn('sui', ['start', '--with-faucet'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  })
  
  let networkStarted = false
  let attempts = 0
  const maxAttempts = 30
  
  // Monitor the output for startup confirmation
  suiProcess.stdout.on('data', (data) => {
    const output = data.toString()
    if (output.includes('Sui RPC server') || output.includes('Started Sui local network')) {
      networkStarted = true
    }
  })
  
  suiProcess.stderr.on('data', (data) => {
    const output = data.toString()
    if (output.includes('Error') && !output.includes('warning')) {
      error(`Network startup error: ${output}`)
    }
  })
  
  // Wait for network to start
  while (!networkStarted && attempts < maxAttempts) {
    await setTimeout(2000)
    attempts++
    
    if (checkIfNetworkRunning()) {
      networkStarted = true
      break
    }
    
    if (attempts % 5 === 0) {
      info(`Waiting for network to start... (${attempts}/${maxAttempts})`)
    }
  }
  
  if (networkStarted) {
    success('Local Sui network started successfully!')
    info('Network details:')
    console.log('  RPC URL: http://127.0.0.1:9000')
    console.log('  Faucet: Available via CLI')
    console.log('  Explorer: Not available for local networks')
  } else {
    error('Failed to start local network within timeout period')
    warning('The network might still be starting. Please wait and check manually with:')
    info('  sui client active-env')
    process.exit(1)
  }
}

function setupLocalEnvironment() {
  step('Setting up local environment...')
  
  try {
    // Switch to local environment
    execCommand('sui client switch --env local', { allowFailure: true })
    success('Switched to local environment')
  } catch (err) {
    // If local env doesn't exist, it will be created by the network start
    info('Local environment will be created automatically')
  }
}

async function main() {
  log('🚀 Sui Local Network Startup Script', 'cyan')
  log('=' .repeat(40), 'cyan')
  
  try {
    checkSuiInstallation()
    setupLocalEnvironment()
    await startLocalNetwork()
    
    console.log('')
    log('🎉 Local Sui Network is Ready!', 'green')
    log('=' .repeat(40), 'green')
    console.log('')
    info('Next steps:')
    console.log('  1. Deploy your contracts: npm run deploy:local')
    console.log('  2. Start development server: npm run dev')
    console.log('  3. Or do both: npm run start:local')
    console.log('')
    info('Useful commands:')
    console.log('  - sui client envs              # List all environments')
    console.log('  - sui client active-address    # Show current address')
    console.log('  - sui client balance           # Check SUI balance')
    console.log('  - sui client faucet            # Request test SUI')
    
  } catch (err) {
    error(`Setup failed: ${err.message}`)
    process.exit(1)
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    error(`Unexpected error: ${err.message}`)
    process.exit(1)
  })
}