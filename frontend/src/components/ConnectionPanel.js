import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// Import API functions
import { connectToIB, disconnectFromIB } from '../services/api';

const ConnectionPanel = ({ connected, onConnectionChange }) => {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('7497');
  const [clientId, setClientId] = useState(Math.floor(Math.random() * 9000) + 1000);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  
  // Handle connection to IB
  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    
    try {
      await connectToIB(host, parseInt(port), parseInt(clientId));
      onConnectionChange(true);
    } catch (err) {
      setError(err.message || 'Failed to connect to Interactive Brokers');
      onConnectionChange(false);
    } finally {
      setConnecting(false);
    }
  };
  
  // Handle disconnection from IB
  const handleDisconnect = async () => {
    setConnecting(true);
    setError('');
    
    try {
      await disconnectFromIB();
      onConnectionChange(false);
    } catch (err) {
      setError(err.message || 'Failed to disconnect from Interactive Brokers');
    } finally {
      setConnecting(false);
    }
  };
  
  return (
    <Box>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <Typography variant="h6">
            Connection Status: 
            <Chip 
              icon={connected ? <CheckCircleIcon /> : <CancelIcon />}
              label={connected ? "Connected" : "Disconnected"}
              color={connected ? "success" : "error"}
              sx={{ ml: 2 }}
            />
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                label="Host"
                variant="outlined"
                fullWidth
                value={host}
                onChange={(e) => setHost(e.target.value)}
                disabled={connected}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                label="Port"
                variant="outlined"
                fullWidth
                value={port}
                onChange={(e) => setPort(e.target.value)}
                disabled={connected}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                label="Client ID"
                variant="outlined"
                fullWidth
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={connected}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              {!connected ? (
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleConnect} 
                  disabled={connecting}
                  fullWidth
                >
                  {connecting ? <CircularProgress size={24} color="inherit" /> : "Connect"}
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={handleDisconnect} 
                  disabled={connecting}
                  fullWidth
                >
                  {connecting ? <CircularProgress size={24} color="inherit" /> : "Disconnect"}
                </Button>
              )}
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      
      <Typography variant="caption" display="block" sx={{ mt: 2 }}>
        Note: Make sure Interactive Brokers TWS or IB Gateway is running and API connections are enabled.
      </Typography>
    </Box>
  );
};

export default ConnectionPanel;