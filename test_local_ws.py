#!/usr/bin/env python3
"""
Sui Local Network WebSocket Connection Tester
Tests WebSocket connectivity and subscriptions to a local Sui network
"""

import asyncio
import json
import sys
import time
from datetime import datetime
import websockets
import aiohttp
from typing import Optional, Dict, Any

# ANSI color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class SuiWebSocketTester:
    def __init__(self, http_url: str = "http://127.0.0.1:9000", ws_url: str = "ws://127.0.0.1:9000"):
        self.http_url = http_url
        self.ws_url = ws_url
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.request_id = 0
        
    def log(self, message: str, color: str = RESET):
        """Print colored log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"{color}[{timestamp}] {message}{RESET}")
        
    async def test_http_connection(self) -> bool:
        """Test HTTP RPC connection"""
        self.log("Testing HTTP RPC connection...", BLUE)
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test basic RPC call
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "sui_getLatestSuiSystemState",
                    "params": []
                }
                
                async with session.post(self.http_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.log(f"✅ HTTP connection successful", GREEN)
                        self.log(f"   Chain ID: {data.get('result', {}).get('chainId', 'Unknown')}", GREEN)
                        self.log(f"   Epoch: {data.get('result', {}).get('epoch', 'Unknown')}", GREEN)
                        return True
                    else:
                        self.log(f"❌ HTTP connection failed with status: {response.status}", RED)
                        return False
                        
        except Exception as e:
            self.log(f"❌ HTTP connection error: {str(e)}", RED)
            self.log("   Make sure Sui is running: sui start --with-faucet", YELLOW)
            return False
            
    async def test_websocket_connection(self) -> bool:
        """Test basic WebSocket connection"""
        self.log("\nTesting WebSocket connection...", BLUE)
        
        try:
            # Attempt to connect with timeout
            self.websocket = await asyncio.wait_for(
                websockets.connect(self.ws_url, 
                                 ping_interval=20,
                                 ping_timeout=10,
                                 close_timeout=10),
                timeout=5.0
            )
            
            self.log(f"✅ WebSocket connection established", GREEN)
            self.log(f"   Connected to: {self.ws_url}", GREEN)
            self.log(f"   State: {self.websocket.state.name}", GREEN)
            return True
            
        except asyncio.TimeoutError:
            self.log(f"❌ WebSocket connection timeout", RED)
            return False
        except Exception as e:
            self.log(f"❌ WebSocket connection error: {str(e)}", RED)
            if "1006" in str(e):
                self.log("   Error 1006: Abnormal closure - Sui might not be fully initialized", YELLOW)
                self.log("   Try waiting a few seconds and running again", YELLOW)
            return False
            
    async def send_rpc_request(self, method: str, params: list = None) -> Dict[str, Any]:
        """Send RPC request over WebSocket"""
        if not self.websocket:
            raise Exception("WebSocket not connected")
            
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params or []
        }
        
        await self.websocket.send(json.dumps(request))
        response = await self.websocket.recv()
        return json.loads(response)
        
    async def test_subscriptions(self):
        """Test various WebSocket subscriptions"""
        if not self.websocket:
            self.log("❌ Cannot test subscriptions - WebSocket not connected", RED)
            return
            
        self.log("\nTesting WebSocket subscriptions...", BLUE)
        
        # Test 1: Subscribe to events
        try:
            self.log("1. Testing event subscription...", BLUE)
            
            # Subscribe to all events
            response = await self.send_rpc_request(
                "suix_subscribeEvent",
                [{"All": []}]  # Subscribe to all events
            )
            
            if "result" in response:
                subscription_id = response["result"]
                self.log(f"   ✅ Event subscription successful (ID: {subscription_id})", GREEN)
                
                # Wait for any events (with timeout)
                self.log("   Waiting for events (5 seconds)...", YELLOW)
                try:
                    event = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
                    event_data = json.loads(event)
                    self.log(f"   📨 Received event: {json.dumps(event_data, indent=2)}", GREEN)
                except asyncio.TimeoutError:
                    self.log("   ⏱️  No events received (this is normal if no transactions are happening)", YELLOW)
                    
                # Unsubscribe
                await self.send_rpc_request("suix_unsubscribeEvent", [subscription_id])
                self.log("   ✅ Unsubscribed from events", GREEN)
                
            else:
                self.log(f"   ❌ Event subscription failed: {response.get('error', 'Unknown error')}", RED)
                
        except Exception as e:
            self.log(f"   ❌ Event subscription error: {str(e)}", RED)
            
        # Test 2: Subscribe to transactions
        try:
            self.log("\n2. Testing transaction subscription...", BLUE)
            
            response = await self.send_rpc_request(
                "suix_subscribeTransaction",
                [{"FromAddress": "0x0000000000000000000000000000000000000000000000000000000000000000"}]
            )
            
            if "result" in response:
                subscription_id = response["result"]
                self.log(f"   ✅ Transaction subscription successful (ID: {subscription_id})", GREEN)
                
                # Unsubscribe
                await self.send_rpc_request("suix_unsubscribeTransaction", [subscription_id])
                
            else:
                self.log(f"   ❌ Transaction subscription failed: {response.get('error', 'Unknown error')}", RED)
                
        except Exception as e:
            self.log(f"   ❌ Transaction subscription error: {str(e)}", RED)
            
    async def test_rpc_methods(self):
        """Test various RPC methods over WebSocket"""
        if not self.websocket:
            self.log("❌ Cannot test RPC methods - WebSocket not connected", RED)
            return
            
        self.log("\nTesting RPC methods over WebSocket...", BLUE)
        
        methods_to_test = [
            ("sui_getChainIdentifier", []),
            ("sui_getLatestCheckpointSequenceNumber", []),
            ("suix_getCommitteeInfo", [None]),
            ("sui_getTotalTransactionBlocks", [])
        ]
        
        for method, params in methods_to_test:
            try:
                self.log(f"Testing {method}...", BLUE)
                response = await self.send_rpc_request(method, params)
                
                if "result" in response:
                    self.log(f"   ✅ {method}: {response['result']}", GREEN)
                else:
                    self.log(f"   ❌ {method} failed: {response.get('error', 'Unknown error')}", RED)
                    
            except Exception as e:
                self.log(f"   ❌ {method} error: {str(e)}", RED)
                
    async def monitor_connection(self, duration: int = 10):
        """Monitor WebSocket connection stability"""
        if not self.websocket:
            self.log("❌ Cannot monitor - WebSocket not connected", RED)
            return
            
        self.log(f"\nMonitoring connection for {duration} seconds...", BLUE)
        start_time = time.time()
        ping_count = 0
        
        try:
            while time.time() - start_time < duration:
                # Send a simple request as a ping
                response = await self.send_rpc_request("sui_getChainIdentifier")
                if "result" in response:
                    ping_count += 1
                    self.log(f"   🏓 Ping {ping_count}: Connection stable", GREEN)
                    
                await asyncio.sleep(2)
                
            self.log(f"✅ Connection remained stable for {duration} seconds", GREEN)
            
        except Exception as e:
            elapsed = int(time.time() - start_time)
            self.log(f"❌ Connection lost after {elapsed} seconds: {str(e)}", RED)
            
    async def run_all_tests(self):
        """Run all connection tests"""
        self.log("=" * 60, BLUE)
        self.log("Sui Local Network WebSocket Tester", BLUE)
        self.log("=" * 60, BLUE)
        
        # Test HTTP first
        http_ok = await self.test_http_connection()
        if not http_ok:
            self.log("\n❌ HTTP connection failed. Sui network might not be running.", RED)
            self.log("Start Sui with: sui start --with-faucet", YELLOW)
            return
            
        # Test WebSocket connection
        ws_ok = await self.test_websocket_connection()
        if not ws_ok:
            self.log("\n⚠️  WebSocket connection failed. Possible solutions:", YELLOW)
            self.log("1. Wait a few seconds for Sui to fully initialize", YELLOW)
            self.log("2. Restart Sui: sui stop && sui start --with-faucet", YELLOW)
            self.log("3. Check if port 9000 is blocked by firewall", YELLOW)
            return
            
        # Test subscriptions and RPC methods
        await self.test_subscriptions()
        await self.test_rpc_methods()
        
        # Monitor connection stability
        await self.monitor_connection(duration=10)
        
        # Clean up
        if self.websocket:
            await self.websocket.close()
            self.log("\n✅ All tests completed. WebSocket connection closed.", GREEN)
            
    async def continuous_monitor(self):
        """Continuously monitor WebSocket connection"""
        self.log("Starting continuous WebSocket monitoring (Ctrl+C to stop)...", BLUE)
        
        reconnect_attempts = 0
        max_reconnect_attempts = 5
        
        while reconnect_attempts < max_reconnect_attempts:
            try:
                # Test HTTP first
                http_ok = await self.test_http_connection()
                if not http_ok:
                    self.log("Waiting 5 seconds before retry...", YELLOW)
                    await asyncio.sleep(5)
                    reconnect_attempts += 1
                    continue
                    
                # Connect WebSocket
                ws_ok = await self.test_websocket_connection()
                if not ws_ok:
                    self.log("Waiting 5 seconds before retry...", YELLOW)
                    await asyncio.sleep(5)
                    reconnect_attempts += 1
                    continue
                    
                # Reset reconnect counter on successful connection
                reconnect_attempts = 0
                
                # Subscribe to events
                response = await self.send_rpc_request("suix_subscribeEvent", [{"All": []}])
                if "result" in response:
                    subscription_id = response["result"]
                    self.log(f"Subscribed to events (ID: {subscription_id})", GREEN)
                    
                    # Monitor events
                    while True:
                        try:
                            message = await asyncio.wait_for(self.websocket.recv(), timeout=30)
                            data = json.loads(message)
                            self.log(f"📨 Event received: {data.get('method', 'Unknown')}", GREEN)
                            
                        except asyncio.TimeoutError:
                            # Send keepalive
                            await self.send_rpc_request("sui_getChainIdentifier")
                            self.log("💓 Keepalive sent", BLUE)
                            
                        except websockets.exceptions.ConnectionClosed as e:
                            self.log(f"Connection closed: {e}", RED)
                            break
                            
            except KeyboardInterrupt:
                self.log("\nMonitoring stopped by user", YELLOW)
                break
                
            except Exception as e:
                self.log(f"Error: {str(e)}", RED)
                reconnect_attempts += 1
                if reconnect_attempts < max_reconnect_attempts:
                    self.log(f"Reconnection attempt {reconnect_attempts}/{max_reconnect_attempts} in 5 seconds...", YELLOW)
                    await asyncio.sleep(5)
                    
        if self.websocket:
            await self.websocket.close()
            
        self.log("Monitoring ended", BLUE)


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test WebSocket connection to Sui local network")
    parser.add_argument("--http-url", default="http://127.0.0.1:9000", help="HTTP RPC URL")
    parser.add_argument("--ws-url", default="ws://127.0.0.1:9000", help="WebSocket URL")
    parser.add_argument("--monitor", action="store_true", help="Run continuous monitoring")
    
    args = parser.parse_args()
    
    tester = SuiWebSocketTester(args.http_url, args.ws_url)
    
    try:
        if args.monitor:
            await tester.continuous_monitor()
        else:
            await tester.run_all_tests()
            
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(0)
        
    except Exception as e:
        print(f"\nUnexpected error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    # Check for required packages
    try:
        import websockets
        import aiohttp
    except ImportError:
        print("Required packages not found. Install with:")
        print("pip install websockets aiohttp")
        sys.exit(1)
        
    # Run the async main function
    asyncio.run(main())
