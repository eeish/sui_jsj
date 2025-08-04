#!/usr/bin/env node

import { execSync, spawn } from 'child_process'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')
const CONTRACTS_DIR = join(PROJECT_ROOT, 'contracts', 'todo')
const ENV_FILE = join(PROJECT_ROOT, '.env.local')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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
      cwd: options.cwd || PROJECT_ROOT,
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

function checkPrerequisites() {
  step('Checking prerequisites...')
  
  // Check if sui is installed
  const suiVersion = execCommand('sui --version', { silent: true, allowFailure: true })
  if (!suiVersion) {
    error('Sui CLI is not installed. Please install it first:')
    console.log('  curl -fLJO https://github.com/MystenLabs/sui/releases/download/mainnet-v1.14.2/sui-mainnet-v1.14.2-ubuntu-x86_64.tgz')
    console.log('  tar -xzf sui-mainnet-v1.14.2-ubuntu-x86_64.tgz')
    console.log('  sudo mv sui-mainnet-v1.14.2-ubuntu-x86_64/sui /usr/local/bin/')
    process.exit(1)
  }
  
  info(`Found Sui CLI: ${suiVersion}`)
  
  // Check if contracts directory exists
  if (!existsSync(CONTRACTS_DIR)) {
    error(`Contracts directory not found: ${CONTRACTS_DIR}`)
    process.exit(1)
  }
  
  success('Prerequisites check passed')
}

function buildContract() {
  step('Building smart contract...')
  
  // Clean previous build (remove build directory if it exists)
  const buildDir = join(CONTRACTS_DIR, 'build')
  try {
    execCommand(`rm -rf ${buildDir}`, { allowFailure: true })
  } catch (err) {
    // Ignore errors when cleaning
  }
  
  // Build the contract
  execCommand('sui move build', { cwd: CONTRACTS_DIR })
  
  success('Smart contract built successfully')
}

function getCurrentAddress() {
  try {
    const clientConfig = execCommand('sui client active-address', { silent: true })
    return clientConfig
  } catch (err) {
    error('Failed to get active address. Make sure you have a Sui wallet configured.')
    info('Run: sui client new-address ed25519')
    info('Run: sui client switch --address YOUR_ADDRESS')
    process.exit(1)
  }
}

function getCurrentNetwork() {
  try {
    const env = execCommand('sui client active-env', { silent: true })
    return env?.trim()
  } catch (err) {
    warning('Could not determine current network, defaulting to testnet')
    return 'testnet'
  }
}

function getAvailableEnvironments() {
  try {
    const envsOutput = execCommand('sui client envs', { silent: true })
    const envs = []
    const lines = envsOutput.split('\n')
    
    for (const line of lines) {
      // Parse the table format: │ alias   │ url                                 │ active │
      const match = line.match(/│\s*([a-zA-Z0-9_-]+)\s*│/)
      if (match && match[1] && match[1] !== 'alias') {
        envs.push(match[1].trim())
      }
    }
    
    return envs
  } catch (err) {
    warning('Could not get available environments')
    return []
  }
}

function switchToNetwork(targetNetwork) {
  const availableEnvs = getAvailableEnvironments()
  const currentNetwork = getCurrentNetwork()
  
  if (currentNetwork === targetNetwork) {
    info(`Already on ${targetNetwork} network`)
    return
  }
  
  // Check if target environment exists
  if (availableEnvs.includes(targetNetwork)) {
    step(`Switching to existing ${targetNetwork} environment...`)
    execCommand(`sui client switch --env ${targetNetwork}`)
    success(`Switched to ${targetNetwork}`)
  } else {
    step(`Creating and switching to ${targetNetwork} environment...`)
    
    // Create the environment with the correct RPC URL
    const rpcUrls = {
      testnet: 'https://fullnode.testnet.sui.io:443',
      mainnet: 'https://fullnode.mainnet.sui.io:443',
      devnet: 'https://fullnode.devnet.sui.io:443',
      local: 'http://127.0.0.1:9000'
    }
    
    const rpcUrl = rpcUrls[targetNetwork]
    if (!rpcUrl) {
      error(`Unknown network: ${targetNetwork}`)
      process.exit(1)
    }
    
    execCommand(`sui client new-env --alias ${targetNetwork} --rpc ${rpcUrl}`)
    execCommand(`sui client switch --env ${targetNetwork}`)
    success(`Created and switched to ${targetNetwork}`)
  }
}

function requestTestnetSui(address) {
  step('Requesting testnet SUI tokens...')
  
  try {
    execCommand(`sui client faucet --address ${address}`)
    success('Testnet SUI tokens requested')
  } catch (err) {
    warning('Failed to request testnet tokens. You may need to request them manually.')
    info(`Visit: https://faucet.testnet.sui.io/ and enter address: ${address}`)
  }
}

function requestLocalSui(address) {
  step('Requesting local network SUI tokens...')
  
  try {
    // For local network, we can use the faucet command which works with local networks
    execCommand(`sui client faucet --address ${address}`)
    success('Local SUI tokens requested')
  } catch (err) {
    warning('Failed to request local tokens automatically.')
    info('Make sure your local Sui network is running with:')
    info('  sui start --with-faucet')
    info('Or request tokens manually with:')
    info(`  sui client faucet --address ${address}`)
  }
}

function checkLocalNetwork() {
  step('Checking local Sui network...')
  
  try {
    // Try to get the chain ID to verify the local network is running
    execCommand('sui client chain-identifier', { silent: true })
    success('Local Sui network is running')
    return true
  } catch (err) {
    error('Local Sui network is not running!')
    console.log('')
    info('To start a local Sui network:')
    console.log('  1. Install Sui from source or use Docker')
    console.log('  2. Run: sui start --with-faucet')
    console.log('  3. Wait for the network to start (usually takes 30-60 seconds)')
    console.log('  4. Verify with: sui client active-env')
    console.log('')
    info('Or switch to testnet with: npm run deploy:testnet')
    return false
  }
}

function deployContract() {
  step('Deploying smart contract...')
  
  const deployOutput = execCommand('sui client publish --gas-budget 100000000', { 
    cwd: CONTRACTS_DIR,
    silent: true 
  })
  
  // Parse deployment output to extract package ID
  const packageIdMatch = deployOutput.match(/│ PackageID: (0x[a-fA-F0-9]+)/);
  if (!packageIdMatch) {
    error('Failed to extract Package ID from deployment output')
    console.log('Deployment output:', deployOutput)
    process.exit(1)
  }
  
  const packageId = packageIdMatch[1]
  success(`Contract deployed with Package ID: ${packageId}`)
  
  return packageId
}

function updateEnvFile(packageId, network) {
  step('Updating environment variables...')
  
  let envContent = ''
  
  // Read existing .env.local if it exists
  if (existsSync(ENV_FILE)) {
    envContent = readFileSync(ENV_FILE, 'utf8')
  }
  
  // Update or add VITE_PACKAGE_ID
  const packageIdRegex = /^VITE_PACKAGE_ID=.*$/m
  const networkRegex = /^VITE_NETWORK=.*$/m
  
  const newPackageIdLine = `VITE_PACKAGE_ID=${packageId}`
  const newNetworkLine = `VITE_NETWORK=${network}`
  
  if (packageIdRegex.test(envContent)) {
    envContent = envContent.replace(packageIdRegex, newPackageIdLine)
  } else {
    envContent += `\n${newPackageIdLine}`
  }
  
  if (networkRegex.test(envContent)) {
    envContent = envContent.replace(networkRegex, newNetworkLine)
  } else {
    envContent += `\n${newNetworkLine}`
  }
  
  // Clean up extra newlines
  envContent = envContent.replace(/\n\n+/g, '\n').trim() + '\n'
  
  writeFileSync(ENV_FILE, envContent)
  success(`Environment file updated: ${ENV_FILE}`)
  
  // Also create .env for Vite dev mode
  const envDevFile = join(PROJECT_ROOT, '.env')
  writeFileSync(envDevFile, envContent)
  success(`Development environment file created: ${envDevFile}`)
}

function displaySummary(packageId, address, network) {
  log('\n' + '='.repeat(60), 'bright')
  log('🎉 DEPLOYMENT SUCCESSFUL!', 'green')
  log('='.repeat(60), 'bright')
  
  console.log('')
  info(`📦 Package ID: ${packageId}`)
  info(`🌐 Network: ${network}`)
  info(`👤 Deployer Address: ${address}`)
  info(`📁 Environment File: ${ENV_FILE}`)
  
  console.log('')
  log('🚀 Next Steps:', 'yellow')
  console.log('  1. Run: npm run dev')
  console.log('  2. Connect your wallet in the browser')
  console.log('  3. Create your first todo list!')
  
  console.log('')
  log('📚 Useful Commands:', 'blue')
  console.log('  - npm run deploy:testnet  # Deploy to testnet')
  console.log('  - npm run deploy:mainnet  # Deploy to mainnet')
  console.log('  - npm run contract:build # Build contract only')
  console.log('  - npm run contract:test  # Run contract tests')
}

async function main() {
  try {
    log('🔨 Sui Todo DApp Deployment Script', 'bright')
    log('=' .repeat(40), 'bright')
    
    // Get command line arguments
    const args = process.argv.slice(2)
    const targetNetwork = args[0] || 'testnet'
    
    if (!['testnet', 'mainnet', 'devnet', 'local'].includes(targetNetwork)) {
      error(`Invalid network: ${targetNetwork}. Use: testnet, mainnet, devnet, or local`)
      process.exit(1)
    }
    
    info(`Target Network: ${targetNetwork}`)
    
    // Switch to target network
    switchToNetwork(targetNetwork)
    
    // Special handling for local network
    if (targetNetwork === 'local') {
      if (!checkLocalNetwork()) {
        process.exit(1)
      }
    }
    
    checkPrerequisites()
    buildContract()
    
    const address = getCurrentAddress()
    info(`Active Address: ${address}`)
    
    // Request tokens based on network type
    if (targetNetwork === 'testnet') {
      const balance = execCommand('sui client balance', { silent: true, allowFailure: true })
      if (!balance || balance.includes('0 SUI')) {
        requestTestnetSui(address)
        // Wait a bit for tokens to arrive
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    } else if (targetNetwork === 'local') {
      const balance = execCommand('sui client balance', { silent: true, allowFailure: true })
      if (!balance || balance.includes('0 SUI')) {
        requestLocalSui(address)
        // Wait a bit for tokens to arrive
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    const packageId = deployContract()
    updateEnvFile(packageId, targetNetwork)
    displaySummary(packageId, address, targetNetwork)
    
  } catch (err) {
    error(`Deployment failed: ${err.message}`)
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