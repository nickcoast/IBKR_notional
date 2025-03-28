import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

// Import custom components
import ConnectionPanel from './components/ConnectionPanel';
import PortfolioMetrics from './components/PortfolioMetrics';
import UnderlyingTable from './components/UnderlyingTable';
import OptionsBrowser from './components/OptionsBrowser';

// Import API services
import { getConnectionStatus, getPortfolioData } from './services/api';

// Create a dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  // State
  const [connected, setConnected] = useState(false);
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showOptionsBrowser, setShowOptionsBrowser] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState('');
  
  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await getConnectionStatus();
        setConnected(status.connected);
      } catch (error) {
        console.error('Error checking connection status:', error);
      }
    };
    
    checkConnection();
  }, []);
  
  // Fetch portfolio data when connected
  useEffect(() => {
    let intervalId = null;
    
    const fetchData = async () => {
      if (!connected) return;
      
      try {
        setLoading(true);
        const data = await getPortfolioData();
        setPortfolioData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
        setError(err.message || 'Failed to fetch portfolio data');
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch immediately on connect
    if (connected) {
      fetchData();
    }
    
    // Set up interval to fetch data every 15 seconds
    if (connected && !intervalId) {
      intervalId = setInterval(fetchData, 15000);
    }
    
    // Clean up interval on disconnect or unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [connected]);
  
  // Handle connection status change
  const handleConnectionChange = (isConnected) => {
    setConnected(isConnected);
    if (!isConnected) {
      setPortfolioData(null);
    }
  };
  
  // Handle opening the options browser
  const handleOpenOptionsBrowser = (ticker) => {
    setSelectedTicker(ticker);
    setShowOptionsBrowser(true);
  };
  
  // Handle closing the options browser
  const handleCloseOptionsBrowser = () => {
    setShowOptionsBrowser(false);
  };
  
  // Clear error message
  const handleClearError = () => {
    setError(null);
  };
  
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="xl">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Interactive Brokers Portfolio Viewer
          </Typography>
          
          {/* Connection Panel */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <ConnectionPanel
              connected={connected}
              onConnectionChange={handleConnectionChange}
            />
          </Paper>
          
          {/* Portfolio Metrics (always visible) */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <PortfolioMetrics data={portfolioData?.account_summary} loading={loading} />
          </Paper>
          
          {/* Main Content Area */}
          {!showOptionsBrowser ? (
            <Paper sx={{ p: 2, mb: 2 }}>
              <UnderlyingTable
                data={portfolioData?.underlying_positions}
                loading={loading}
                onOpenOptionsBrowser={handleOpenOptionsBrowser}
              />
            </Paper>
          ) : (
            <Paper sx={{ p: 2, mb: 2 }}>
              <OptionsBrowser
                ticker={selectedTicker}
                onClose={handleCloseOptionsBrowser}
              />
            </Paper>
          )}
          
          {/* Loading Indicator */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
            </Box>
          )}
          
          {/* Error Snackbar */}
          <Snackbar open={!!error} autoHideDuration={6000} onClose={handleClearError}>
            <Alert onClose={handleClearError} severity="error">
              {error}
            </Alert>
          </Snackbar>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;