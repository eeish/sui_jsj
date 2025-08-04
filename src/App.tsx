import { ConnectButton, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { TodoApp } from './components/TodoApp'
import './App.css'

// Configuration - loaded from environment variables
const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || 'YOUR_PACKAGE_ID_HERE'

function App() {
  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>Sui Todo DApp</h1>
        <ConnectButton />
      </header>
      
      <main>
        {currentAccount ? (
          <TodoApp 
            account={currentAccount}
            client={suiClient}
            packageId={PACKAGE_ID}
          />
        ) : (
          <div className="connect-prompt">
            <p>Connect your wallet to get started</p>
            <ConnectButton />
          </div>
        )}
      </main>
    </div>
  )
}

export default App