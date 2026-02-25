/**
 * Google Cloud Function to securely handle OCR requests
 * This is the EXACT code from your working Expo project
 */


const { ImageAnnotatorClient } = require('@google-cloud/vision');

const visionClient = new ImageAnnotatorClient();

// --------------------------------------------------------------------------
// CORE LOGIC - EXACT COPY FROM WORKING PROJECT
// --------------------------------------------------------------------------

// index.js refactor
async function performOcr(base64Image) {
  const request = {
    image: { content: base64Image },
    features: [{ type: 'TEXT_DETECTION' }],
  };

  const [result] = await visionClient.annotateImage(request);
  const fullTextAnnotation = result.fullTextAnnotation;
  if (!fullTextAnnotation || !fullTextAnnotation.text) return "";

  // CLEANUP: Split into lines and take only the first 2-3
  // This removes publisher info at the bottom and price tags
  const lines = fullTextAnnotation.text.split('\n')
    .filter(line => line.trim().length > 1) // Remove symbols/single chars
    .slice(0, 3) 
    .join(' ');

  return lines.trim();
}

//Old code
// async function performOcr(base64Image) {
//   const request = {
//     image: {
//       content: base64Image,
//     },
//     features: [{ type: 'TEXT_DETECTION' }],
//   };

//   // Call the Vision API
//   const [result] = await visionClient.annotateImage(request);

//   // Check if text was successfully detected
//   const fullTextAnnotation = result.fullTextAnnotation;
//   if (!fullTextAnnotation || !fullTextAnnotation.text) {
//     return "";
//   }

//   // Return ALL the text detected in the image
//   return fullTextAnnotation.text.trim();
// }

// --------------------------------------------------------------------------
// INPUT VALIDATION - EXACT COPY FROM WORKING PROJECT
// --------------------------------------------------------------------------

function validateRequest(body) {
  if (!body || !body.image) {
    throw new Error('Invalid request body. Missing "image" property.');
  }

  // Handle if the app adds a prefix, otherwise use raw Base64 data
  const base64Image = body.image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  if (!base64Image) {
    throw new Error('The image data cannot be empty.');
  }

  // Validate Base64 format
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64Image)) {
    throw new Error('Image data is not a valid Base64 string.');
  }

  return base64Image;
}

// --------------------------------------------------------------------------
// MAIN EXPORT - WITH CORS
// --------------------------------------------------------------------------

exports.ocrHandler = async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');

  // Handle pre-flight CORS requests
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'Method Not Allowed. Only POST is accepted.' });
  }

  try {
    // 1. Validate and extract image data
    const base64Image = validateRequest(req.body);
    console.log(`Received image data size: ${base64Image.length} bytes.`);

    // 2. Perform OCR
    const extractedText = await performOcr(base64Image);
    
    console.log('Extracted text:', extractedText);

    // 3. Respond with the extracted text
    res.status(200).send({
      success: true,
      text: extractedText,
      message: extractedText ? 'Text successfully extracted.' : 'No text detected in the image.',
    });

  } catch (error) {
    console.error('OCR Error:', error.message || error);
    res.status(500).send({
      success: false,
      error: 'An internal server error occurred during OCR processing.',
      details: error.message,
    });
  }
};