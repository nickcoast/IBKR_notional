import pandas as pd
import asyncio
import locale
import random
from datetime import datetime
import traceback

# Set locale for proper currency formatting
locale.setlocale(locale.LC_ALL, '')

# Import our utility functions
from utils import safe_float_conversion

# Import IB API after setting up asyncio environment
try:
    from ib_insync import IB, Stock, Option, util
except ImportError:
    raise ImportError("Please install ib_insync: pip install ib_insync")

class IBClient:
    def __init__(self):
        self.ib = IB()
        self.client_id = None
        self.connected = False
        self._setup_asyncio()
    
    def _setup_asyncio(self):
        """Ensure there is an event loop available for the current thread"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop
    
    def _run_async(self, coro):
        """Safely run an async coroutine and return its result"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    def connect(self, host='127.0.0.1', port=7497, client_id=None):
        """Connect to Interactive Brokers TWS/Gateway"""
        if client_id is None:
            client_id = random.randint(1000, 9999)
        
        self.client_id = client_id
        
        try:
            # Disconnect first if already connected
            if self.ib.isConnected():
                self.ib.disconnect()
            
            # Connect to IB
            self.ib.connect(host, port, clientId=client_id)
            self.connected = self.ib.isConnected()
            
            # Request delayed market data by default
            if self.connected:
                self.ib.reqMarketDataType(3)  # 3 = delayed data
            
            return self.connected
        except Exception as e:
            print(f"Connection error: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from Interactive Brokers"""
        if self.ib.isConnected():
            self.ib.disconnect()
            self.connected = False
    
    def is_connected(self):
        """Check if connected to Interactive Brokers"""
        self.connected = self.ib.isConnected()
        print(f"IB connection status check: {self.connected}")
        return self.connected
    
    # Portfolio data functions
    async def async_get_portfolio_data(self):
        """Get portfolio data asynchronously"""
        try:
            print("Starting async_get_portfolio_data...")
            
            # Get account summary
            print("Requesting account summary...")
            account_summary = await self.ib.accountSummaryAsync()
            print(f"Account summary received, length: {len(account_summary) if account_summary else 0}")
            
            if not account_summary:
                print("Account summary is empty")
                return None, None
                
            # Create DataFrame from account summary
            print("Creating account DataFrame...")
            account_df = pd.DataFrame([(row.tag, row.value) for row in account_summary], 
                                columns=['Tag', 'Value'])
            account_df = account_df.set_index('Tag')
            print("Account DataFrame created successfully")
            
            # Get positions
            print("Requesting positions...")
            positions = await self.ib.positionsAsync()
            print(f"Positions received, length: {len(positions) if positions else 0}")
            
            if not positions:
                print("No positions found - returning empty positions DataFrame")
                # Return account data even if no positions
                return account_df, pd.DataFrame()
            
            # Create a dictionary to store positions by underlying
            positions_by_underlying = {}
            
            # Process positions
            for pos in positions:
                contract = pos.contract
                underlying_symbol = contract.symbol
                
                # Get market price for the underlying
                if contract.secType == 'STK':
                    underlying_contract = contract
                else:
                    # For options, get the underlying price
                    underlying_contract = Stock(underlying_symbol, 'SMART', 'USD')
                    await self.ib.qualifyContractsAsync(underlying_contract)
                
                # Use ticker to get real-time price updates
                ticker = self.ib.reqMktData(underlying_contract)
                await asyncio.sleep(0.2)  # Small delay to respect rate limits
                underlying_price = ticker.marketPrice()
                
                # Handle None or 0 prices
                if underlying_price is None or underlying_price <= 0:
                    underlying_price = ticker.last
                    if underlying_price is None or underlying_price <= 0:
                        underlying_price = (ticker.ask + ticker.bid) / 2 if ticker.ask and ticker.bid else None
                        if underlying_price is None or underlying_price <= 0:
                            if contract.secType == 'STK':
                                underlying_price = pos.avgCost
                                print(f"No market price for {underlying_symbol}, using avg cost: {underlying_price}")
                            else:
                                print(f"No price data for {underlying_symbol}, using 100 as placeholder")
                                underlying_price = 100  # Arbitrary placeholder
                
                if underlying_symbol not in positions_by_underlying:
                    positions_by_underlying[underlying_symbol] = {
                        'stock_count': 0,
                        'stock_value': 0,
                        'option_notional': 0,
                        'option_actual_value': 0,
                        'underlying_price': underlying_price
                    }
                
                # Calculate position values
                if contract.secType == 'STK':
                    positions_by_underlying[underlying_symbol]['stock_count'] += pos.position
                    positions_by_underlying[underlying_symbol]['stock_value'] += pos.position * underlying_price
                elif contract.secType == 'OPT':
                    # Get option data
                    option_ticker = self.ib.reqMktData(contract)
                    await asyncio.sleep(0.2)  # Small delay to respect rate limits
                    
                    # Calculate option delta (if available, otherwise use approximation)
                    delta = None
                    option_price = option_ticker.marketPrice()
                    
                    if hasattr(option_ticker, 'modelGreeks') and option_ticker.modelGreeks:
                        delta = option_ticker.modelGreeks.delta
                    else:
                        # Request option computation
                        await self.ib.reqMarketDataTypeAsync(4)  # Switch to delayed frozen data
                        try:
                            await self.ib.calculateImpliedVolatilityAsync(contract, option_price, underlying_price)
                            await asyncio.sleep(0.2)
                            await self.ib.calculateOptionPriceAsync(contract, option_ticker.impliedVolatility, underlying_price)
                            await asyncio.sleep(0.2)
                            
                            # Try again to get delta
                            if hasattr(option_ticker, 'modelGreeks') and option_ticker.modelGreeks:
                                delta = option_ticker.modelGreeks.delta
                        except Exception as option_error:
                            print(f"Option calculation error: {option_error}")
                        
                        # Fallback delta calculation if still None
                        if delta is None:
                            if contract.right == 'C':  # Call option
                                delta = 0.7 if underlying_price > contract.strike else 0.3
                            else:  # Put option
                                delta = -0.7 if underlying_price < contract.strike else -0.3
                    
                    # Use absolute value of delta for notional calculation
                    abs_delta = abs(delta)
                    option_multiplier = 100
                    option_notional = abs_delta * option_multiplier * pos.position
                    positions_by_underlying[underlying_symbol]['option_notional'] += option_notional
                    
                    # Calculate actual option value
                    option_value = option_price * option_multiplier * abs(pos.position)
                    positions_by_underlying[underlying_symbol]['option_actual_value'] += option_value
            
            # Create DataFrame for display
            underlying_data = []
            total_npv = 0
            
            for symbol, data in positions_by_underlying.items():
                stock_notional = data['stock_count'] * data['underlying_price']
                option_notional = data['option_notional'] * data['underlying_price']
                total_notional = stock_notional + option_notional
                
                underlying_data.append({
                    'Symbol': symbol,
                    'Stock Count': data['stock_count'],
                    'Stock Value': data['stock_value'],
                    'Option Notional (Shares)': data['option_notional'] / 100,  # Convert to contract equivalents
                    'Option Notional Value': option_notional,
                    'Option Actual Value': data['option_actual_value'],
                    'Underlying Price': data['underlying_price'],
                    'Notional Position Value (NPV)': total_notional
                })
                
                total_npv += total_notional
            
            underlying_df = pd.DataFrame(underlying_data)
            
            # Calculate portfolio metrics
            try:
                nlv = safe_float_conversion(account_df.loc['NetLiquidation', 'Value'])
                gross_pos_val = safe_float_conversion(account_df.loc['GrossPositionValue', 'Value'])
                
                # Calculate notional leverage ratio
                notional_leverage_ratio = total_npv / nlv if nlv > 0 else 0
                standard_leverage_ratio = gross_pos_val / nlv if nlv > 0 else 0
                
                # Add NGAV and NLR to account summary
                account_df.loc['NGAV (Notional Gross Asset Value)', 'Value'] = str(total_npv)
                account_df.loc['NLR (Notional Leverage Ratio)', 'Value'] = f"{notional_leverage_ratio:.2f}"
                account_df.loc['Standard Leverage Ratio', 'Value'] = f"{standard_leverage_ratio:.2f}"
            except Exception as metrics_error:
                print(f"Error calculating metrics: {metrics_error}")
            
            return account_df, underlying_df
            
        except Exception as e:
            print(f"Error in portfolio data retrieval: {str(e)}")
            print(traceback.format_exc())
            return None, None
    
    def get_portfolio_data(self):
        """Get portfolio data (non-async wrapper)"""
        if not self.ib.isConnected():
            print("Not connected to IB, returning None")
            return None, None
        
        try:
            print("Running async_get_portfolio_data from get_portfolio_data...")
            return self._run_async(self.async_get_portfolio_data())
        except Exception as e:
            print(f"Error getting portfolio data: {e}")
            print(traceback.format_exc())
            return None, None
    
    # Option chain functions
    async def async_get_option_chain(self, ticker):
        """Get option chain for a ticker asynchronously"""
        # Get the stock contract
        stock = Stock(ticker, 'SMART', 'USD')
        await self.ib.qualifyContractsAsync(stock)
        
        # Get current stock price
        ticker = self.ib.reqMktData(stock)
        await asyncio.sleep(0.2)
        stock_price = ticker.marketPrice()
        
        # Get the option chains
        chains = await self.ib.reqSecDefOptParamsAsync(stock.symbol, '', stock.secType, stock.conId)
        
        # Get all expiration dates
        expirations = []
        for chain in chains:
            if chain.exchange == 'SMART':
                expirations = sorted(chain.expirations)
                break
        
        # Return all data needed
        return stock_price, expirations
    
    def get_option_chain(self, ticker):
        """Get option chain (non-async wrapper)"""
        if not self.ib.isConnected():
            return None, None
        
        try:
            return self._run_async(self.async_get_option_chain(ticker))
        except Exception as e:
            print(f"Error getting option chain: {e}")
            return None, None
    
    # Options for specific expiration
    async def async_get_options_for_expiration(self, ticker, expiration):
        """Get options data for a specific expiration asynchronously"""
        # Get the stock contract
        stock = Stock(ticker, 'SMART', 'USD')
        await self.ib.qualifyContractsAsync(stock)
        
        # Get current stock price
        ticker_data = self.ib.reqMktData(stock)
        await asyncio.sleep(0.2)
        stock_price = ticker_data.marketPrice()
        
        # Get option chain for selected expiration
        chains = await self.ib.reqSecDefOptParamsAsync(stock.symbol, '', stock.secType, stock.conId)
        
        # Find the SMART exchange chain
        chain = next((c for c in chains if c.exchange == 'SMART'), None)
        if not chain:
            return None, None, None
        
        # Get all strike prices
        strikes = sorted(chain.strikes)
        
        # Create call and put options
        calls = []
        puts = []
        
        # Request data for each strike
        for strike in strikes:
            call_contract = Option(ticker, expiration, strike, 'C', 'SMART')
            put_contract = Option(ticker, expiration, strike, 'P', 'SMART')
            
            await self.ib.qualifyContractsAsync(call_contract, put_contract)
            
            # Request market data for call
            call_ticker = self.ib.reqMktData(call_contract)
            await asyncio.sleep(0.1)  # Small delay to respect rate limits
            
            # Request market data for put
            put_ticker = self.ib.reqMktData(put_contract)
            await asyncio.sleep(0.1)  # Small delay
            
            # Get data for call
            call_price = call_ticker.marketPrice()
            call_bid = call_ticker.bid
            call_ask = call_ticker.ask
            call_last = call_ticker.last
            
            # Try to get delta and gamma for call
            call_delta = None
            call_gamma = None
            
            if hasattr(call_ticker, 'modelGreeks') and call_ticker.modelGreeks:
                call_delta = call_ticker.modelGreeks.delta
                call_gamma = call_ticker.modelGreeks.gamma
            else:
                # Use approximation
                call_delta = 0.7 if stock_price > strike else 0.3
                call_gamma = 0.01  # Default gamma
            
            # Similarly for put
            put_price = put_ticker.marketPrice()
            put_bid = put_ticker.bid
            put_ask = put_ticker.ask
            put_last = put_ticker.last
            
            put_delta = None
            put_gamma = None
            
            if hasattr(put_ticker, 'modelGreeks') and put_ticker.modelGreeks:
                put_delta = put_ticker.modelGreeks.delta
                put_gamma = put_ticker.modelGreeks.gamma
            else:
                # Use approximation
                put_delta = -0.7 if stock_price < strike else -0.3
                put_gamma = 0.01  # Default gamma
            
            # Calculate percentage of stock price
            call_pct = (call_price / stock_price) * 100 if stock_price > 0 else 0
            put_pct = (put_price / stock_price) * 100 if stock_price > 0 else 0
            
            # Calculate difference from stock price
            call_diff = call_price - (stock_price - strike) if stock_price > strike else call_price
            put_diff = put_price - (strike - stock_price) if stock_price < strike else put_price
            
            calls.append({
                'Strike': strike,
                'Bid': call_bid,
                'Ask': call_ask,
                'Last': call_last,
                'Price': call_price,
                'Delta': call_delta,
                'Gamma': call_gamma,
                'Pct of Stock': call_pct,
                'Diff from Stock': call_diff
            })
            
            puts.append({
                'Strike': strike,
                'Bid': put_bid,
                'Ask': put_ask,
                'Last': put_last,
                'Price': put_price,
                'Delta': put_delta,
                'Gamma': put_gamma,
                'Pct of Stock': put_pct,
                'Diff from Stock': put_diff
            })
        
        return stock_price, calls, puts
    
    def get_options_for_expiration(self, ticker, expiration):
        """Get options data for specific expiration (non-async wrapper)"""
        if not self.ib.isConnected():
            return None, None, None
        
        try:
            return self._run_async(self.async_get_options_for_expiration(ticker, expiration))
        except Exception as e:
            print(f"Error getting options data: {e}")
            return None, None, None