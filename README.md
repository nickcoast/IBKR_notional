# Interactive Brokers Portfolio Viewer

A web application that uses the Interactive Brokers API to display portfolio data and options information.

## Features

- View portfolio-wide metrics like Net Liquidation Value, Gross Position Value, Notional Gross Asset Value (NGAV), and Notional Leverage Ratio (NLR)
- Display positions grouped by underlying symbol
- Browse option chains for any ticker, with support for multiple expiration dates
- View options data with calculated metrics like delta, gamma, percentage of stock price, and difference from stock price
- Real-time data updates through the IB API

## Architecture

This application uses:

- **Backend**: Flask Python backend that connects to IB TWS API using ib_insync
- **Frontend**: React with Material-UI for the user interface

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- Interactive Brokers TWS or IB Gateway running with API enabled

## Setup

### 1. Setup Interactive Brokers TWS/Gateway

1. Make sure TWS or IB Gateway is running
2. Go to Edit > Global Configuration > API > Settings
3. Enable ActiveX and Socket Clients
4. Make sure Socket port is set to 7497 (default)
5. If you have problems connecting, try setting API Precautions to "Bypass"

### 2. Setup the Backend

1. Clone this repository
2. Navigate to the backend folder:

```bash
cd backend
```

3. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

4. Install the requirements:

```bash
pip install -r requirements.txt
```

5. Start the Flask backend:

```bash
python app.py
```

The backend API will be available at http://localhost:5000/api

### 3. Setup the Frontend

1. Navigate to the frontend folder:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the React development server:

```bash
npm start
```

The frontend will be available at http://localhost:3000

## Usage

1. Open the application in your browser
2. Connect to Interactive Brokers using the connection panel
3. View your portfolio metrics and positions
4. Click the "Options" button next to any position to view the options chain for that ticker
5. Navigate between different expiration dates using the tabs

## Configuration

### Backend Configuration

- The Flask backend runs on port 5000 by default
- You can change the port by setting the PORT environment variable

### Frontend Configuration

- The React frontend connects to the backend API at http://localhost:5000/api by default
- You can change the API URL by setting the REACT_APP_API_URL environment variable in the .env file

## Troubleshooting

### Connection Issues

- Make sure TWS or IB Gateway is running before connecting
- Verify that API connections are enabled in TWS/Gateway
- Check that the correct port is configured (default is 7497)
- Try using a different client ID if you're having connection issues

### Data Issues

- If options data isn't showing, make sure you have market data subscriptions for those symbols
- If no positions show up, verify that you're logged into the correct account in TWS/Gateway
- For pricing errors, ensure that market data permissions are properly set in TWS/Gateway
