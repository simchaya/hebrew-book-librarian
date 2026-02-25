import React, { useRef, useState, useCallback } from 'react';
import { fetchBookData, testAI, type BookData } from '../utils/fetchBookData';

const OCR_FUNCTION_URL = "https://us-central1-librarian-ocr-app.cloudfunctions.net/ocrHandler";

export default function BookScanner() {
  const [ocrLines, setOcrLines] = useState<string[]>([]);
  const [bookResult, setBookResult] = useState<BookData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>(""); // NEW: For Heartbeat milestone
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanCover = useCallback(async (file: File) => {
    if (!file) return;

    setOcrLines([]);
    setBookResult(null);
    setAiStatus(""); 
    setError(null);
    setIsLoading(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Read failed"));
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });

      const response = await fetch(OCR_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();

      if (data.success && data.text) {
        // Added : string to 'l' to fix the TypeScript error ts(7006)
        const lines = data.text.split('\n')
          .map((l: string) => l.trim()) 
          .filter((l: string) => l.length > 1);
          
        setOcrLines(lines);
        
        // --- MILESTONE 3: HEARTBEAT LOGIC ---
        setAiStatus("Checking AI heartbeat...");
        const heartbeat = await testAI();
        setAiStatus(`AI Status: ${heartbeat}`);

        // --- MILESTONE 4: BOOK LOGIC ---
        const result = await fetchBookData(lines);
        if (result) {
          setBookResult(result);
        } else {
          setBookResult({ title: "Identification Failed", description: "AI is online but this book isn't in its index." });
        }
      } else {
        setError("No text detected.");
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>📚 Hebrew Librarian</h1>
        <p>Milestone-Based Recognition</p>
      </header>

      <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleScanCover(e.target.files[0])} style={{ display: 'none' }} accept="image/*" />

      <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} style={isLoading ? styles.scanButtonDisabled : styles.scanButton}>
        {isLoading ? "🔄 Scanning..." : "📸 Upload Cover"}
      </button>

      {/* NEW: HEARTBEAT DISPLAY (Uses your existing text theme) */}
      {aiStatus && <p style={{ textAlign: 'center', fontSize: '13px', color: '#007bff', marginTop: '10px' }}>🤖 {aiStatus}</p>}

      {error && <div style={styles.error}>{error}</div>}

      {/* MILESTONE 2: YOUR ORIGINAL BOX */}
      {ocrLines.length > 0 && (
        <div style={styles.ocrDebug}>
          <h3 style={styles.subHeader}>🔍 Step 2: OCR Text Found</h3>
          <div style={styles.ocrBox}>
            {ocrLines.map((line, i) => <div key={i} style={{ direction: 'rtl' }}>{line}</div>)}
          </div>
        </div>
      )}

      {/* MILESTONE 4: YOUR ORIGINAL CARD */}
      {bookResult && (
        <div style={styles.card}>
          <h3 style={styles.subHeader}>📖 Step 4: AI Analysis</h3>
          {bookResult.coverUri && <img src={bookResult.coverUri} alt="Cover" style={styles.cover} />}
          <h2 style={styles.title}>{bookResult.title}</h2>
          {bookResult.authors && <p style={styles.authorLine}>By {bookResult.authors.join(', ')}</p>}
          <div style={styles.metadataGrid}>
            <div style={styles.metaItem}><strong>Publisher:</strong> {bookResult.publisher || 'Unknown'}</div>
            <div style={styles.metaItem}><strong>Year:</strong> {bookResult.year || 'N/A'}</div>
          </div>
          <div style={styles.descriptionBox}>
            <p style={styles.descriptionText}>{bookResult.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// I AM USING YOUR EXACT STYLES OBJECT BELOW
const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'system-ui' },
  header: { textAlign: 'center', marginBottom: '20px' },
  subHeader: { fontSize: '14px', color: '#666', textTransform: 'uppercase', marginBottom: '10px' },
  scanButton: { width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  scanButtonDisabled: { width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: '#ccc', color: '#fff', border: 'none' },
  ocrDebug: { marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px', border: '1px solid #dee2e6' },
  ocrBox: { backgroundColor: '#fff', padding: '10px', borderRadius: '5px', fontSize: '14px', border: '1px solid #eee' },
  card: { marginTop: '20px', padding: '20px', backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #eee' },
  cover: { width: '100px', borderRadius: '5px', display: 'block', margin: '0 auto 15px' },
  title: { fontSize: '20px', textAlign: 'center' },
  authorLine: { textAlign: 'center', color: '#666', fontStyle: 'italic' },
  metadataGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
  metaItem: { fontSize: '12px' },
  descriptionBox: { marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' },
  descriptionText: { fontSize: '14px', direction: 'rtl', textAlign: 'right', color: '#444' },
  error: { color: 'red', textAlign: 'center', marginTop: '10px' }
};