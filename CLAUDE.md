# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (runs Vite dev server with HMR)
- **Build for production**: `npm run build` (compiles TypeScript and builds with Vite)
- **Lint code**: `npm run lint` (runs ESLint on all files)
- **Preview production build**: `npm run preview` (serves built files locally)

## Project Architecture

This is a React + TypeScript + Vite application with the following key characteristics:

### Tech Stack
- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7 with React plugin
- **Blockchain Integration**: Mysten Labs Sui ecosystem (@mysten/dapp-kit, @mysten/sui)
- **State Management**: React Query (@tanstack/react-query) for server state
- **Linting**: ESLint with TypeScript support and React-specific rules

### Key Dependencies
- `@mysten/dapp-kit` and `@mysten/sui`: Sui blockchain integration toolkit
- `@tanstack/react-query`: For asynchronous state management and data fetching
- Standard React 19 ecosystem with modern TypeScript support

### Project Structure
- `src/App.tsx`: Main application component
- `src/main.tsx`: Application entry point with React root setup
- `contracts/`: Move language smart contracts for Sui blockchain
- Standard Vite project structure with public assets in `/public`

### TypeScript Configuration
- Uses TypeScript 5.8 with project references
- Separate configs for app (`tsconfig.app.json`) and Node (`tsconfig.node.json`)
- ESLint configured with TypeScript-aware rules

### Development Notes
- This appears to be a Sui blockchain dApp project based on the Mysten dependencies
- Uses modern React patterns (functional components, hooks)
- Configured for ES modules (`"type": "module"` in package.json)
- ESLint includes React hooks and refresh plugins for development experience