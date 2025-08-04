# Sui Todo DApp

A full-stack decentralized todo application built on the Sui blockchain using React, TypeScript, and Move smart contracts.

## 🚀 Features

- ✅ Create and manage todo lists on-chain
- ✅ Add tasks with titles and descriptions
- ✅ Mark tasks as completed
- ✅ Real-time updates via blockchain events
- ✅ Responsive design for mobile and desktop
- ✅ TypeScript for type safety
- ✅ Modern React patterns with hooks

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Blockchain**: Sui Network, Move language
- **State Management**: React Query (@tanstack/react-query)
- **Wallet Integration**: Mysten Labs dApp Kit
- **Styling**: CSS3 with modern features
- **Development**: ESLint, Prettier, Node.js scripts

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) for contract deployment
- A Sui wallet (recommended: [Sui Wallet](https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil))

## 🏗 Quick Start

### Option A: Local Development (Fastest)

```bash
# 1. Clone and setup
git clone <your-repo-url>
cd vite-project
npm run setup

# 2. Start local Sui network
npm run local:start

# 3. Deploy and start development (one command!)
npm run start:local
```

### Option B: Testnet Development

```bash
# 1. Clone and setup
git clone <your-repo-url>
cd vite-project
npm run setup

# 2. Configure environment (optional)
# Edit .env.local if you want to customize settings

# 3. Deploy to testnet and start development
npm run start
```

### Manual Setup

If you prefer step-by-step setup:

#### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd vite-project
npm run setup  # Installs dependencies and creates .env.local
```

#### 2. Choose Your Network

**For Local Development:**
```bash
npm run local:start          # Start local Sui network
npm run deploy:local         # Deploy contracts locally
```

**For Testnet Development:**
```bash
npm run deploy:testnet       # Deploy to Sui testnet
```

**For Other Networks:**
```bash
npm run deploy:mainnet       # Deploy to mainnet (requires real SUI)
npm run deploy:devnet        # Deploy to devnet
```

#### 3. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to see your dApp!

The deploy script automatically:
- Builds the Move contract
- Deploys to the specified network
- Updates your `.env.local` with the Package ID
- Requests SUI tokens if needed (testnet/local)

## 📝 Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run start` - Deploy to testnet and start dev server

### Smart Contracts
- `npm run contract:build` - Build Move contracts
- `npm run contract:test` - Run contract tests
- `npm run contract:fmt` - Format Move code
- `npm run contract:clean` - Clean build artifacts

### Deployment
- `npm run deploy` - Deploy to default network (testnet)
- `npm run deploy:local` - Deploy to local Sui network
- `npm run deploy:testnet` - Deploy to Sui testnet
- `npm run deploy:mainnet` - Deploy to Sui mainnet
- `npm run deploy:devnet` - Deploy to Sui devnet

### Code Quality
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run test` - Run all tests (contract + linting + typecheck)
- `npm run ci` - Run CI pipeline (test + build)

### Utilities
- `npm run setup` - Install dependencies and setup environment
- `npm run clean` - Clean all build artifacts

### Local Network
- `npm run local:start` - Start local Sui network with faucet
- `npm run local:stop` - Stop local Sui network
- `npm run start:local` - Start local network, deploy contracts, and run dev server

## 🏗 Project Structure

```
vite-project/
├── contracts/todo/          # Move smart contracts
│   ├── sources/
│   │   └── todo.move       # Main contract file
│   ├── tests/
│   │   └── todo_tests.move # Contract tests
│   └── Move.toml           # Contract configuration
├── scripts/
│   ├── deploy.js           # Deployment script
│   └── test-contract.js    # Contract testing script
├── src/
│   ├── components/
│   │   └── TodoApp.tsx     # Main todo component
│   ├── App.tsx             # Root application component
│   ├── main.tsx            # Application entry point
│   └── App.css             # Styling
├── .env.example            # Environment template
├── .prettierrc             # Prettier configuration
└── package.json            # Dependencies and scripts
```

## 📱 Usage

1. **Connect Wallet**: Click "Connect Wallet" and select your Sui wallet
2. **Create Todo List**: Click "Create Todo List" to initialize your on-chain todo list
3. **Add Tasks**: Fill in the title and description, then click "Add Task"
4. **Complete Tasks**: Click the "✓ Complete" button on any pending task
5. **View History**: All tasks persist on-chain and are visible across sessions

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_PACKAGE_ID` | Deployed contract package ID | `YOUR_PACKAGE_ID_HERE` |
| `VITE_NETWORK` | Target Sui network | `testnet` |
| `VITE_LOCAL_RPC` | Custom local RPC URL | `http://127.0.0.1:9000` |
| `VITE_TESTNET_RPC` | Custom testnet RPC URL | Sui default |
| `VITE_MAINNET_RPC` | Custom mainnet RPC URL | Sui default |
| `VITE_DEVNET_RPC` | Custom devnet RPC URL | Sui default |

### Network Configuration

The app automatically configures the correct RPC endpoints for each network. You can override these by setting custom RPC URLs in your environment variables.

## 🧪 Testing

### Smart Contract Tests

```bash
npm run contract:test
```

Tests are written in Move and located in `contracts/todo/tests/`. They verify:
- Todo list creation
- Task creation and management
- Access control and ownership
- Event emission

### Frontend Tests

```bash
npm run typecheck  # TypeScript validation
npm run lint       # ESLint checks
npm run test       # All tests combined
```

## 🚀 Deployment

### Testnet Deployment (Recommended)

```bash
npm run deploy:testnet
```

### Mainnet Deployment

```bash
npm run deploy:mainnet
```

**Important**: Mainnet deployment requires real SUI tokens. Make sure you have sufficient balance for gas fees.

### Deployment Process

The deployment script:
1. Validates prerequisites (Sui CLI, wallet setup)
2. Builds the Move contract with optimizations
3. Deploys to the specified network
4. Extracts and saves the Package ID
5. Updates environment variables automatically
6. Provides deployment summary and next steps

## 🔍 Troubleshooting

### Common Issues

**"Package ID not configured"**
- Run `npm run deploy:testnet` to deploy and configure automatically
- Or manually set `VITE_PACKAGE_ID` in `.env.local`

**"Wallet not connected"**
- Install a Sui wallet extension
- Make sure you're connected to the correct network
- Check if you have sufficient SUI balance

**"Failed to build contract"**
- Ensure Sui CLI is installed and updated
- Check that `contracts/todo/` directory exists
- Verify Move.toml configuration

**"RPC connection failed"**
- Check your internet connection
- Verify the network configuration
- Try using a different RPC endpoint

**"Local network not running"**
- Start the local network: `npm run local:start`
- Or manually: `sui start --with-faucet`
- Check if port 9000 is already in use
- Verify Sui CLI is properly installed

**"Local deployment fails"**
- Ensure local network is running first
- Check that you have SUI balance: `sui client balance`
- Request local tokens: `sui client faucet`
- Verify you're on the local environment: `sui client active-env`

**"Chain identifier error" or "Invalid Sui chain identifier"**
- This can occur with local networks due to wallet compatibility
- Try using testnet for wallet interactions: `npm run deploy:testnet`
- Local networks may have limited wallet support
- Ensure you're using a compatible Sui wallet version

### Getting Help

1. Check the [Sui Documentation](https://docs.sui.io/)
2. Visit the [Sui Discord](https://discord.gg/sui)
3. Review contract code in `contracts/todo/sources/todo.move`
4. Check browser console for detailed error messages

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm run test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Sui Foundation](https://sui.io/) for the blockchain platform
- [Mysten Labs](https://mystenlabs.com/) for the development tools
- [Vite](https://vitejs.dev/) for the build system
- [React](https://reactjs.org/) for the frontend framework
