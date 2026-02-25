// src/hooks/useBookScanner.ts

import { fetchBookData } from "../utils/fetchBookData.ts"; 
import { useCallback, useEffect, useState } from "react";

// imported from the environment variables
const OCR_FUNCTION_URL = import.meta.env.VITE_OCR_FUNCTION_URL;

export const useBookScanner = () => {
  const [title, setTitle] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [bookDataUrl, setBookDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------
  // Auto-fetch book data when OCR text changes
  // ------------------------------------------
  useEffect(() => {
    if (!title) return;

    const delay = setTimeout(async () => {
      try {
        setError(null);
        // Step 3: Fetch book data from Google API using the OCR'd text
        const fetchedData = await fetchBookData(title);
        
        let finalTitle = title;

        if (fetchedData) {
          if (fetchedData.title) {
            finalTitle = fetchedData.title;
          }
          if (fetchedData.coverUri) {
            setCoverUri(fetchedData.coverUri);
          }
        }

        // Step 4: Prepare the Google Search URL
        const searchTitle = encodeURIComponent(finalTitle);
        // Using a general Google search query for the best link results
        setBookDataUrl(`https://www.google.com/search?q=${searchTitle}`); 
        
        // Update state with the formal title
        setTitle(finalTitle);

      } catch (err) {
        console.warn("Auto-book data fetch failed:", err);
        // We only set a soft error, as the title is still available for search
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delay);
  }, [title]);


  // ------------------------------------------
  // Scan Cover Logic (Web API Implementation)
  // ------------------------------------------
  
  // This function takes a Web 'File' object from the input element
  const handleScanCover = useCallback(async (file: File) => {
    if (!file) return;

    // Reset state and show loading
    setTitle("");
    setCoverUri(null);
    setBookDataUrl(null);
    setError(null);
    setIsLoading(true);

    try {
      // 1. Convert File to Base64 (Web equivalent of Expo FileSystem read)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const resultString = reader.result as string;
          // Strip the data URL prefix (e.g., 'data:image/png;base64,')
          const base64String = resultString.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      // validation for local development if the variable is missing
      if (!OCR_FUNCTION_URL) {
        throw new Error("VITE_OCR_FUNCTION_URL is not defined in the environment.");
      }

      // DEBUG: Log the URL to verify it's loaded
      console.log("OCR_FUNCTION_URL:", OCR_FUNCTION_URL);
      console.log("Image size (base64 length):", base64.length);

      // 2. Your existing Cloud Function call (API endpoint remains the same)
      const response = await fetch(OCR_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("OCR Response data:", data);

      // Your cloud function returns 'text'
      if (data.text) { 
        setTitle(data.text.trim());
      } else {
        setError("No Hebrew text detected. Please ensure the title is centered and clear.");
      }
    } catch (err: any) {
      console.error("OCR Error:", err);
      setError(`OCR processing failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Action to open the search link
  const openBookData = useCallback(() => {
      if (bookDataUrl) {
          window.open(bookDataUrl, "_blank");
      }
  }, [bookDataUrl]);


  return {
    title,
    coverUri,
    isLoading,
    error,
    bookDataUrl,
    handleScanCover,
    openBookData,
  };
};