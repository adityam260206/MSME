import { useState, useCallback } from 'react';

/**
 * A custom hook to handle the boilerplate of API calls:
 * loading states, error catching, and data extraction.
 * 
 * @param {Function} apiFunc - The API function to execute
 * @returns {Object} { data, error, isLoading, execute }
 */
export default function useApi(apiFunc) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (...args) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiFunc(...args);
      setData(response.data.data); // Unwrap the API envelope
      return response.data.data;
    } catch (err) {
      setError(err);
      throw err; // Let the component handle the error (e.g. show toast)
    } finally {
      setIsLoading(false);
    }
  }, [apiFunc]);

  return { data, error, isLoading, execute };
}
