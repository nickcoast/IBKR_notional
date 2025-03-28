import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import InfoIcon from '@mui/icons-material/Info';

// Import formatters
import { formatCurrency, formatNumber } from '../utils/formatters';

const MetricCard = ({ title, value, tooltip, loading }) => {
  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        {tooltip && (
          <Tooltip title={tooltip} placement="top">
            <InfoIcon fontSize="small" color="action" sx={{ ml: 1 }} />
          </Tooltip>
        )}
      </Box>
      
      {loading ? (
        <Skeleton variant="text" width="100%" height={40} />
      ) : (
        <Typography variant="h5" component="div">
          {value || 'N/A'}
        </Typography>
      )}
    </Paper>
  );
};

const PortfolioMetrics = ({ data, loading }) => {
  // Helper function to get value from data
  const getValue = (key, defaultValue = '') => {
    if (!data || !data[key]) return defaultValue;
    return data[key].Value;
  };
  
  // Calculate metric values
  const nlv = getValue('NetLiquidation');
  const grossPosVal = getValue('GrossPositionValue');
  const ngav = getValue('NGAV (Notional Gross Asset Value)');
  const nlr = getValue('NLR (Notional Leverage Ratio)');
  const stdLeverage = getValue('Standard Leverage Ratio');
  const buyingPower = getValue('BuyingPower');
  
  // Format currency values
  const formattedNLV = loading ? null : formatCurrency(nlv);
  const formattedGrossPosVal = loading ? null : formatCurrency(grossPosVal);
  const formattedNGAV = loading ? null : formatCurrency(ngav);
  const formattedBuyingPower = loading ? null : formatCurrency(buyingPower);
  
  // Format ratio values
  const formattedNLR = loading ? null : `${formatNumber(nlr, 2)}x`;
  const formattedStdLeverage = loading ? null : `${formatNumber(stdLeverage, 2)}x`;
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Portfolio Metrics
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Net Liquidation Value"
            value={formattedNLV}
            tooltip="Total value of the portfolio, including cash, securities, and options"
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Gross Position Value"
            value={formattedGrossPosVal}
            tooltip="Total absolute value of all positions without taking into account leverage"
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="NGAV"
            value={formattedNGAV}
            tooltip="Notional Gross Asset Value - Sum of stock value plus notional value of all options (based on delta-adjusted shares)"
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Standard Leverage"
            value={formattedStdLeverage}
            tooltip="Gross Position Value divided by Net Liquidation Value"
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Notional Leverage Ratio"
            value={formattedNLR}
            tooltip="Notional Gross Asset Value divided by Net Liquidation Value - accounts for leverage from options"
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Buying Power"
            value={formattedBuyingPower}
            tooltip="Available funds for new positions"
            loading={loading}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default PortfolioMetrics;