from flask import Flask, jsonify, request
from flask_cors import CORS
import asyncio
import nest_asyncio
import time
import threading
import traceback
import os
from datetime import datetime

# Import our custom modules
from ib_client import IBClient
from utils import safe_float_conversion, format_currency

nest_asyncio.apply()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables
ib_client = None
portfolio_data = {
    'account_summary': None,
    'underlying_positions': None,
    'last_update': None
}
options_data = {}
stop_event = threading.Event()

# Configure event loop for the main thread
if not asyncio.get_event_loop().is_running():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

# Setup asyncio for background threads
def setup_asyncio_event_loop():
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop

# Background thread to update portfolio data
# Modify the update_portfolio_data function in app.py
def update_portfolio_data():
    setup_asyncio_event_loop()
    global portfolio_data, ib_client
    
    while not stop_event.is_set():
        if ib_client and ib_client.is_connected():
            try:
                print("Attempting to get portfolio data...")
                
                # Use direct portfolio access
                accounts = ib_client.ib.managedAccounts()
                if accounts:
                    account_id = accounts[0]
                    print(f"Using account: {account_id}")
                    
                    # Create a basic account summary with some values
                    account_summary = {
                        'NetLiquidation': {'Value': '0'},
                        'GrossPositionValue': {'Value': '0'},
                        'BuyingPower': {'Value': '0'},
                    }
                    
                    # Get portfolio directly
                    portfolio_items = ib_client.ib.portfolio()
                    print(f"Portfolio items received: {len(portfolio_items)}")
                    
                    # Process portfolio items
                    underlying_data = []
                    for item in portfolio_items:
                        print(f"Processing item: {item.contract.symbol}")
                        underlying_data.append({
                            'Symbol': item.contract.symbol,
                            'Stock Count': item.position if item.contract.secType == 'STK' else 0,
                            'Stock Value': item.marketValue if item.contract.secType == 'STK' else 0,
                            'Option Notional (Shares)': 0,  # Placeholder 
                            'Option Notional Value': 0,
                            'Option Actual Value': item.marketValue if item.contract.secType == 'OPT' else 0,
                            'Underlying Price': item.marketPrice if item.marketPrice else item.averageCost,
                            'Notional Position Value (NPV)': item.marketValue
                        })
                    
                    # Update portfolio data
                    portfolio_data = {
                        'account_summary': account_summary,
                        'underlying_positions': underlying_data,
                        'last_update': datetime.now().isoformat()
                    }
                    
                    print("Portfolio data set successfully")
                
            except Exception as e:
                print(f"Error updating portfolio data: {e}")
                print(f"Full traceback: {traceback.format_exc()}")
                
        # Sleep until next update (15 seconds)
        time.sleep(15)

# Function to update options data in background
def update_options_data(ticker, expiration):
    setup_asyncio_event_loop()
    global options_data, ib_client
    
    last_key = f"{ticker}_{expiration}"
    
    while not stop_event.is_set():
        if ib_client and ib_client.is_connected():
            try:
                # Check if request is still active
                current_key = request.args.get('options_key')
                if not current_key or current_key != last_key:
                    # Stop updating if request has changed or ended
                    break
                    
                stock_price, calls, puts = ib_client.get_options_for_expiration(ticker, expiration)
                
                if stock_price is not None and calls and puts:
                    options_data[last_key] = {
                        'stock_price': stock_price,
                        'calls': calls,
                        'puts': puts,
                        'last_update': datetime.now().isoformat()
                    }
            except Exception as e:
                print(f"Error updating options data: {e}")
                
        # Sleep until next update (5 seconds)
        time.sleep(5)

# Routes
@app.route('/api/connect', methods=['POST'])
def connect():
    global ib_client
    
    data = request.json
    host = data.get('host', '127.0.0.1')
    port = data.get('port', 7497)
    client_id = data.get('client_id')
    
    # Initialize IB client if not already initialized
    if not ib_client:
        ib_client = IBClient()
    
    # Try to connect
    success = ib_client.connect(host, port, client_id)
    
    if success:
        # Start portfolio update thread if not already running
        if not any(t.name == 'portfolio_updater' for t in threading.enumerate()):
            portfolio_thread = threading.Thread(target=update_portfolio_data, name='portfolio_updater')
            portfolio_thread.daemon = True
            portfolio_thread.start()
        
        return jsonify({"status": "connected", "message": "Successfully connected to Interactive Brokers"})
    else:
        return jsonify({"status": "error", "message": "Failed to connect to Interactive Brokers"}), 500

@app.route('/api/disconnect', methods=['POST'])
def disconnect():
    global ib_client
    
    if ib_client:
        ib_client.disconnect()
        return jsonify({"status": "disconnected", "message": "Disconnected from Interactive Brokers"})
    else:
        return jsonify({"status": "warning", "message": "No active connection to disconnect"})

@app.route('/api/status', methods=['GET'])
def status():
    global ib_client
    
    if ib_client:
        connected = ib_client.is_connected()
        return jsonify({
            "connected": connected,
            "client_id": ib_client.client_id if connected else None
        })
    else:
        return jsonify({"connected": False, "client_id": None})

@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    global portfolio_data, ib_client
    
    if not ib_client or not ib_client.is_connected():
        return jsonify({"status": "error", "message": "Not connected to Interactive Brokers"}), 400
        
    if not portfolio_data.get('account_summary'):
        return jsonify({"status": "waiting", "message": "Portfolio data not yet available"}), 202
        
    return jsonify(portfolio_data)

@app.route('/api/option_chain', methods=['GET'])
def get_option_chain():
    global ib_client
    
    if not ib_client or not ib_client.is_connected():
        return jsonify({"status": "error", "message": "Not connected to Interactive Brokers"}), 400
        
    ticker = request.args.get('ticker')
    if not ticker:
        return jsonify({"status": "error", "message": "Ticker symbol is required"}), 400
        
    # Get option chain
    stock_price, expirations = ib_client.get_option_chain(ticker)
    
    if stock_price is None or not expirations:
        return jsonify({"status": "error", "message": "Failed to retrieve option chain data"}), 404
        
    # Format expiration dates
    formatted_expirations = []
    for exp in expirations:
        try:
            date_obj = datetime.strptime(exp, '%Y%m%d')
            formatted_expirations.append({
                'value': exp,
                'label': date_obj.strftime('%Y-%m-%d')
            })
        except ValueError:
            formatted_expirations.append({
                'value': exp,
                'label': exp
            })
    
    return jsonify({
        "ticker": ticker,
        "stock_price": stock_price,
        "expirations": formatted_expirations
    })

@app.route('/api/options', methods=['GET'])
def get_options():
    global options_data, ib_client
    
    if not ib_client or not ib_client.is_connected():
        return jsonify({"status": "error", "message": "Not connected to Interactive Brokers"}), 400
        
    ticker = request.args.get('ticker')
    expiration = request.args.get('expiration')
    
    if not ticker or not expiration:
        return jsonify({"status": "error", "message": "Ticker and expiration are required"}), 400
    
    key = f"{ticker}_{expiration}"
    request.args = {'options_key': key}  # Store current request key
    
    # Check if we have cached data
    if key in options_data:
        return jsonify(options_data[key])
    
    # Start a thread to update this data if not already running
    option_thread_exists = any(t.name == f'options_updater_{key}' for t in threading.enumerate())
    if not option_thread_exists:
        options_thread = threading.Thread(
            target=update_options_data, 
            args=(ticker, expiration),
            name=f'options_updater_{key}'
        )
        options_thread.daemon = True
        options_thread.start()
        
        # Return temporary response while data is being fetched
        return jsonify({"status": "loading", "message": "Fetching options data..."}), 202
    else:
        # Still waiting for data
        return jsonify({"status": "loading", "message": "Fetching options data..."}), 202
    
@app.route('/api/test_connection', methods=['GET'])
def test_connection():
    global ib_client
    
    if not ib_client or not ib_client.is_connected():
        return jsonify({"status": "error", "message": "Not connected to Interactive Brokers"}), 400
        
    try:
        # Test a simple request
        account = ib_client.ib.managedAccounts()
        return jsonify({
            "status": "success", 
            "account": account, 
            "connected": ib_client.is_connected()
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@app.route('/api/direct_data', methods=['GET'])
def get_direct_data():
    global ib_client
    
    if not ib_client or not ib_client.is_connected():
        return jsonify({"status": "error", "message": "Not connected to Interactive Brokers"}), 400
        
    try:
        # Get account IDs
        accounts = ib_client.ib.managedAccounts()
        
        # Get portfolio directly
        portfolio_items = ib_client.ib.portfolio()
        
        # Format portfolio items
        portfolio_data = []
        for item in portfolio_items:
            portfolio_data.append({
                'symbol': item.contract.symbol,
                'position': item.position,
                'marketPrice': item.marketPrice,
                'marketValue': item.marketValue,
                'averageCost': item.averageCost,
                'unrealizedPNL': item.unrealizedPNL,
                'realizedPNL': item.realizedPNL,
            })
        
        return jsonify({
            "status": "success",
            "accounts": accounts,
            "portfolio": portfolio_data,
            "time": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/detailed_status', methods=['GET'])
def get_detailed_status():
    global ib_client
    
    if not ib_client:
        return jsonify({"status": "Not initialized"}), 200
    
    try:
        conn_status = ib_client.is_connected()
        accounts = ib_client.ib.managedAccounts() if conn_status else []
        client_id = ib_client.client_id if hasattr(ib_client, 'client_id') else None
        
        # Try to get basic account data
        account_values = []
        if conn_status and accounts:
            # Get account values directly
            for val in ib_client.ib.accountValues():
                if val.currency == 'USD':
                    account_values.append({
                        'tag': val.tag,
                        'value': val.value
                    })
        
        return jsonify({
            "connected": conn_status,
            "client_id": client_id,
            "accounts": accounts,
            "account_values_count": len(account_values),
            "portfolio_count": len(ib_client.ib.portfolio()),
            "sample_account_values": account_values[:5] if account_values else []
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# Clean up resources when the app closes
def cleanup():
    global ib_client, stop_event
    
    # Signal threads to stop
    stop_event.set()
    
    # Disconnect from IB
    if ib_client and ib_client.is_connected():
        ib_client.disconnect()
    
    print("Cleanup complete.")

# Register cleanup function to be called on exit
import atexit
atexit.register(cleanup)

if __name__ == '__main__':
    # Get port from environment or use default
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)