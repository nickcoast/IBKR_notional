/**
 * Format a number as currency (USD)
 * @param {number} value - The value to format
 * @param {boolean} includeCents - Whether to include cents in the formatted value
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, includeCents = true) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '$0.00';
    }
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: includeCents ? 2 : 0,
      maximumFractionDigits: includeCents ? 2 : 0,
    });
    
    return formatter.format(value);
  };
  
  /**
   * Format a number as a percentage
   * @param {number} value - The value to format
   * @param {number} decimals - Number of decimal places to include
   * @returns {string} Formatted percentage string
   */
  export const formatPercentage = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00%';
    }
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    
    return formatter.format(value / 100);
  };
  
  /**
   * Format a number with commas and decimal places
   * @param {number} value - The value to format
   * @param {number} decimals - Number of decimal places to include
   * @returns {string} Formatted number string
   */
  export const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }
    
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    
    return formatter.format(value);
  };
  
  /**
   * Format a date string
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  export const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  /**
   * Format a time string
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted time string
   */
  export const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  
  /**
   * Format a date and time string
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date and time string
   */
  export const formatDateTime = (dateString) => {
    if (!dateString) return '';
    
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
  };