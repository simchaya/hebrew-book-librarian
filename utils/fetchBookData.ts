export interface BookData {
  title?: string;
  authors?: string[];
  publisher?: string;
  year?: string;
  description?: string;
  isbn13?: string;
  language?: string;
  coverUri?: string;
}

const MODEL_ID = "gemini-2.5-flash"; 
const API_VERSION = "v1beta";

export async function testAI(): Promise<string> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_ID}:generateContent?key=${API_KEY}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Repeat: 'AI Heartbeat: OK'" }] }] })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
  } catch (err: any) {
    return `AI Offline: ${err.message}`;
  }
}

export async function fetchBookData(ocrLines: string[]): Promise<BookData | undefined> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_ID}:generateContent?key=${API_KEY}`;

  const prompt = `
    # Hebrew Book Information Retrieval Agent
    You are a specialized research assistant focused on finding comprehensive information about Hebrew books. 
    Your mission is to gather detailed information based on OCR text from a book cover.

    ## Priority Sources
    1. Simania (simania.co.il)
    2. Hebrew Wikipedia
    3. Israeli National Library (nli.org.il)
    4. Israeli Bookstores (Steimatzky/Tzomet Sfarim)

    ## OCR TEXT FROM COVER
    ---
    ${ocrLines.join("\n")}
    ---

    ## Instructions
    - Analyze the OCR text for Title, Author, and Publisher.
    - Correct OCR typos (e.g., 'ח' instead of 'ה').
    - Cross-reference with your knowledge of the priority sources above to ensure accuracy.
    - Do not guess; if a field is unknown based on the text and your source knowledge, leave it empty.

    Return ONLY a JSON object:
    {
      "title": "Hebrew Title",
      "authors": ["Author 1"],
      "publisher": "Hebrew Publisher",
      "year": "YYYY",
      "description": "2-3 sentence summary in Hebrew",
      "language": "he"
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, topP: 0.8 }
      })
    });

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) return undefined;

    const cleanJson = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    const bookData = JSON.parse(cleanJson);
    
    // Using the retry function to handle 429 errors
    const coverUri = await fetchCoverWithRetry(bookData.title || "");
    return { ...bookData, coverUri };
  } catch (error) {
    console.error("Agent Logic Error:", error);
    return undefined;
  }
}

// THE MISSING FUNCTION
async function fetchCoverWithRetry(title: string, retries = 2): Promise<string | undefined> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=1`);
      
      if (res.status === 429) {
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const data = await res.json();
      const thumbnail = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
      return thumbnail ? thumbnail.replace("http:", "https:") : undefined;
    } catch {
      continue;
    }
  }
  return undefined;
}