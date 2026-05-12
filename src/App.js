import { useState } from 'react';

function App() {
  const [resumeText, setResumeText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setResumeText(text);
  };

  const analyzeResume = async () => {
    if (!resumeText) {
      alert('Please upload a resume first!');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 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"
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [{
            role: "user",
            content: "Analyze this resume. Return ONLY a valid JSON object with these fields: ats_score (number 0-100), strengths (array of strings), weaknesses (array of strings), suggestions (array of strings), missing_keywords (array of strings). No extra text before or after JSON. Resume: " + resumeText
          }]
        })
      });
      const data = await res.json();
      if (!data.choices) {
        setError('API Error: ' + JSON.stringify(data));
        setLoading(false);
        return;
      }
      const txt = data.choices[0].message.content;
      const clean = txt.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch(err) {
      setError('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:"800px",margin:"0 auto",padding:"20px",fontFamily:"Arial"}}>
      <h1 style={{color:"#2563eb",textAlign:"center"}}>Resume Analyzer</h1>
      <div style={{marginBottom:"20px"}}>
        <label><b>Upload Resume (TXT file):</b></label>
        <br/>
        <input type="file" accept=".txt" onChange={handleFile} style={{marginTop:"8px"}}/>
      </div>
      <button
        onClick={analyzeResume}
        style={{background:"#2563eb",color:"white",padding:"12px 24px",border:"none",borderRadius:"8px",fontSize:"16px",cursor:"pointer"}}>
        {loading ? "Analyzing..." : "Analyze Resume"}
      </button>
      {error && (
        <div style={{marginTop:"20px",padding:"10px",background:"#fee2e2",borderRadius:"8px"}}>
          <p style={{color:"red",margin:0}}>{error}</p>
        </div>
      )}
      {result && (
        <div style={{marginTop:"30px"}}>
          <h2 style={{color: result.ats_score >= 70 ? "green" : "red"}}>
            ATS Score: {result.ats_score}/100
          </h2>
          <h3>✅ Strengths</h3>
          <ul>{result.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul>
          <h3>⚠️ Weaknesses</h3>
          <ul>{result.weaknesses.map((w,i) => <li key={i}>{w}</li>)}</ul>
          <h3>💡 Suggestions</h3>
          <ul>{result.suggestions.map((s,i) => <li key={i}>{s}</li>)}</ul>
          <h3>❌ Missing Keywords</h3>
          <ul>{result.missing_keywords.map((k,i) => <li key={i}>{k}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default App;