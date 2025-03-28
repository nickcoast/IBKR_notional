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
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/formatters';

const OptionsTable = ({ callsData, putsData, stockPrice, loading }) => {
  // Merge calls and puts data by strike
  const mergeDataByStrike = () => {
    const strikeMap = new Map();
    
    // Add call options
    callsData.forEach(call => {
      strikeMap.set(call.Strike, { 
        call,
        put: null
      });
    });
    
    // Add put options
    putsData.forEach(put => {
      if (strikeMap.has(put.Strike)) {
        strikeMap.get(put.Strike).put = put;
      } else {
        strikeMap.set(put.Strike, {
          call: null,
          put
        });
      }
    });
    
    // Convert map to array and sort by strike
    return Array.from(strikeMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([strike, data]) => ({
        strike,
        ...data
      }));
  };
  
  const mergedData = mergeDataByStrike();
  
  // Columns to display
  const optionColumns = [
    { id: 'bid', label: 'Bid', format: value => formatCurrency(value) },
    { id: 'ask', label: 'Ask', format: value => formatCurrency(value) },
    { id: 'last', label: 'Last', format: value => formatCurrency(value) },
    { id: 'price', label: 'Price', format: value => formatCurrency(value) },
    { id: 'delta', label: 'Delta', format: value => formatNumber(value, 3) },
    { id: 'gamma', label: 'Gamma', format: value => formatNumber(value, 3) },
    { id: 'pctOfStock', label: '% of Stock', format: value => formatPercentage(value, 2) },
    { id: 'diffFromStock', label: 'Diff from Stock', format: value => formatCurrency(value) }
  ];
  
  return (
    <Grid container spacing={1}>
      {/* Call Options */}
      <Grid item xs={5.5}>
        <Typography variant="subtitle1" sx={{ mb: 1, textAlign: 'center' }}>
          CALLS
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="call options table">
            <TableHead>
              <TableRow>
                {optionColumns.slice().reverse().map((column) => (
                  <TableCell key={column.id} align="right">
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && !mergedData.length ? (
                // Skeleton rows when loading
                Array.from(new Array(10)).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from(new Array(optionColumns.length)).map((_, cellIndex) => (
                      <TableCell key={cellIndex} align="right">
                        <Skeleton animation="wave" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                mergedData.map((row) => (
                  <TableRow 
                    key={`call-${row.strike}`}
                    sx={{ 
                      backgroundColor: row.strike < stockPrice 
                        ? 'rgba(0, 255, 0, 0.03)'  // In the money (slight green)
                        : row.strike > stockPrice 
                          ? 'rgba(255, 0, 0, 0.03)' // Out of the money (slight red)
                          : 'rgba(255, 255, 0, 0.03)' // At the money (slight yellow)
                    }}
                  >
                    {optionColumns.slice().reverse().map((column) => (
                      <TableCell key={column.id} align="right">
                        {row.call 
                          ? column.format(row.call[column.id.charAt(0).toUpperCase() + column.id.slice(1)]) 
                          : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
      
      {/* Strike Prices Column */}
      <Grid item xs={1}>
        <Typography variant="subtitle1" sx={{ mb: 1, textAlign: 'center' }}>
          STRIKE
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="strike prices">
            <TableHead>
              <TableRow>
                <TableCell align="center">Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && !mergedData.length ? (
                // Skeleton rows when loading
                Array.from(new Array(10)).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell align="center">
                      <Skeleton animation="wave" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                mergedData.map((row) => (
                  <TableRow 
                    key={`strike-${row.strike}`}
                    sx={{ 
                      fontWeight: Math.abs(row.strike - stockPrice) < (stockPrice * 0.02) ? 'bold' : 'normal',
                      backgroundColor: Math.abs(row.strike - stockPrice) < (stockPrice * 0.01)
                        ? 'rgba(255, 255, 0, 0.1)' // Highlight strikes near current price
                        : 'inherit'
                    }}
                  >
                    <TableCell 
                      align="center" 
                      sx={{ 
                        fontWeight: Math.abs(row.strike - stockPrice) < (stockPrice * 0.02) ? 'bold' : 'normal',
                      }}
                    >
                      {formatCurrency(row.strike, false)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
      
      {/* Put Options */}
      <Grid item xs={5.5}>
        <Typography variant="subtitle1" sx={{ mb: 1, textAlign: 'center' }}>
          PUTS
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="put options table">
            <TableHead>
              <TableRow>
                {optionColumns.map((column) => (
                  <TableCell key={column.id} align="right">
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && !mergedData.length ? (
                // Skeleton rows when loading
                Array.from(new Array(10)).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from(new Array(optionColumns.length)).map((_, cellIndex) => (
                      <TableCell key={cellIndex} align="right">
                        <Skeleton animation="wave" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                mergedData.map((row) => (
                  <TableRow 
                    key={`put-${row.strike}`}
                    sx={{ 
                      backgroundColor: row.strike > stockPrice 
                        ? 'rgba(0, 255, 0, 0.03)'  // In the money for puts (slight green)
                        : row.strike < stockPrice 
                          ? 'rgba(255, 0, 0, 0.03)' // Out of the money for puts (slight red)
                          : 'rgba(255, 255, 0, 0.03)' // At the money (slight yellow)
                    }}
                  >
                    {optionColumns.map((column) => (
                      <TableCell key={column.id} align="right">
                        {row.put 
                          ? column.format(row.put[column.id.charAt(0).toUpperCase() + column.id.slice(1)]) 
                          : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );
};

export default OptionsTable;