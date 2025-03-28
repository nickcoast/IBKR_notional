import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

// Import components
import OptionsTable from './OptionsTable';

// Import API functions and formatters
import { getOptionChain, getOptionsData } from '../services/api';
import { formatCurrency } from '../utils/formatters';

const OptionsBrowser = ({ ticker, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stockPrice, setStockPrice] = useState(0);
  const [expirations, setExpirations] = useState([]);
  const [selectedExpirationIndex, setSelectedExpirationIndex] = useState(0);
  const [callsData, setCallsData] = useState([]);
  const [putsData, setPutsData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  
  // Load option chain on mount
  useEffect(() => {
    const fetchOptionChain = async () => {
      setLoading(true);
      setError('');
      
      try {
        const data = await getOptionChain(ticker);
        setStockPrice(data.stock_price);
        setExpirations(data.expirations);
        
        if (data.expirations.length > 0) {
          setSelectedExpirationIndex(0);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch option chain');
      } finally {
        setLoading(false);
      }
    };
    
    if (ticker) {
      fetchOptionChain();
    }
  }, [ticker]);
  
  // Load options data when expiration changes
  useEffect(() => {
    let intervalId = null;
    
    const fetchOptionsData = async () => {
      if (!ticker || expirations.length === 0) return;
      
      setOptionsLoading(true);
      
      try {
        const expiration = expirations[selectedExpirationIndex]?.value;
        if (!expiration) return;
        
        const data = await getOptionsData(ticker, expiration);
        
        // If we get a loading response, wait for the next interval
        if (data.status === 'loading') {
          return;
        }
        
        setStockPrice(data.stock_price);
        setCallsData(data.calls);
        setPutsData(data.puts);
        setLastUpdate(data.last_update);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to fetch options data');
      } finally {
        setOptionsLoading(false);
      }
    };
    
    // Fetch immediately when expiration changes
    if (expirations.length > 0) {
      fetchOptionsData();
    }
    
    // Set up interval to fetch data every 5 seconds
    if (expirations.length > 0 && !intervalId) {
      intervalId = setInterval(fetchOptionsData, 5000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [ticker, expirations, selectedExpirationIndex]);
  
  // Change selected expiration
  const handleExpirationChange = (event, newValue) => {
    setSelectedExpirationIndex(newValue);
  };
  
  // Navigate to previous expiration
  const handlePrevExpiration = () => {
    if (selectedExpirationIndex > 0) {
      setSelectedExpirationIndex(selectedExpirationIndex - 1);
    }
  };
  
  // Navigate to next expiration
  const handleNextExpiration = () => {
    if (selectedExpirationIndex < expirations.length - 1) {
      setSelectedExpirationIndex(selectedExpirationIndex + 1);
    }
  };
  
  // Show more expirations (scroll left)
  const handleScrollLeft = () => {
    // This would be implemented to scroll the tabs to the left
    // For now, just a placeholder
  };
  
  // Show more expirations (scroll right)
  const handleScrollRight = () => {
    // This would be implemented to scroll the tabs to the right
    // For now, just a placeholder
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {ticker} Options
          {stockPrice > 0 && (
            <Typography component="span" variant="subtitle1" sx={{ ml: 2 }}>
              Stock Price: {formatCurrency(stockPrice)}
            </Typography>
          )}
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<CloseIcon />}
          onClick={onClose}
        >
          Close Options Browser
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ my: 4, textAlign: 'center' }}>
          {error}
        </Typography>
      ) : expirations.length > 0 ? (
        <Box>
          {/* Expiration date selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton 
              onClick={handleScrollLeft} 
              disabled={expirations.length <= 5}
            >
              <KeyboardArrowLeftIcon />
            </IconButton>
            
            <IconButton 
              onClick={handlePrevExpiration} 
              disabled={selectedExpirationIndex === 0}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Tabs
                value={selectedExpirationIndex}
                onChange={handleExpirationChange}
                variant="scrollable"
                scrollButtons={false}
                sx={{ maxWidth: '100%' }}
              >
                {expirations.map((exp, index) => (
                  <Tab key={exp.value} label={exp.label} />
                ))}
              </Tabs>
            </Box>
            
            <IconButton 
              onClick={handleNextExpiration} 
              disabled={selectedExpirationIndex === expirations.length - 1}
            >
              <ArrowForwardIcon />
            </IconButton>
            
            <IconButton 
              onClick={handleScrollRight} 
              disabled={expirations.length <= 5}
            >
              <KeyboardArrowRightIcon />
            </IconButton>
          </Box>
          
          {/* Options table */}
          {optionsLoading && (!callsData.length || !putsData.length) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <OptionsTable 
              callsData={callsData}
              putsData={putsData}
              stockPrice={stockPrice}
              loading={optionsLoading}
            />
          )}
          
          {/* Last updated timestamp */}
          {lastUpdate && (
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="caption" color="text.secondary">
                Last updated: {new Date(lastUpdate).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Typography sx={{ my: 4, textAlign: 'center' }}>
          No option chain data available for {ticker}
        </Typography>
      )}
    </Box>
  );
};

export default OptionsBrowser;