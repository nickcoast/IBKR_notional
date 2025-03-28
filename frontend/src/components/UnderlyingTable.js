import React from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import SearchIcon from '@mui/icons-material/Search';
import { formatCurrency, formatNumber } from '../utils/formatters';

const UnderlyingTable = ({ data, loading, onOpenOptionsBrowser }) => {
  // Handle click on the options browser button
  const handleOptionsClick = (symbol) => {
    onOpenOptionsBrowser(symbol);
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Positions by Underlying
      </Typography>
      
      <TableContainer component={Paper} elevation={0}>
        <Table sx={{ minWidth: 650 }} size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell align="right">Stock Count</TableCell>
              <TableCell align="right">Stock Value</TableCell>
              <TableCell align="right">Option Notional (Shares)</TableCell>
              <TableCell align="right">Option Notional Value</TableCell>
              <TableCell align="right">Option Actual Value</TableCell>
              <TableCell align="right">Underlying Price</TableCell>
              <TableCell align="right">Notional Position Value (NPV)</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // Show skeleton rows when loading
              Array.from(new Array(5)).map((_, index) => (
                <TableRow key={index}>
                  {Array.from(new Array(9)).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton animation="wave" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data && data.length > 0 ? (
              // Show actual data
              data.map((row) => (
                <TableRow key={row.Symbol}>
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" fontWeight="bold">
                      {row.Symbol}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatNumber(row['Stock Count'], 0)}</TableCell>
                  <TableCell align="right">{formatCurrency(row['Stock Value'])}</TableCell>
                  <TableCell align="right">{formatNumber(row['Option Notional (Shares)'], 2)}</TableCell>
                  <TableCell align="right">{formatCurrency(row['Option Notional Value'])}</TableCell>
                  <TableCell align="right">{formatCurrency(row['Option Actual Value'])}</TableCell>
                  <TableCell align="right">{formatCurrency(row['Underlying Price'], false)}</TableCell>
                  <TableCell align="right">{formatCurrency(row['Notional Position Value (NPV)'])}</TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SearchIcon />}
                      onClick={() => handleOptionsClick(row.Symbol)}
                    >
                      Options
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              // Show empty state
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" py={3} color="text.secondary">
                    No position data available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Last updated timestamp */}
      {data && (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date().toLocaleString()}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default UnderlyingTable;