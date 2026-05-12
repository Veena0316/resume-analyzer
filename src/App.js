import { useState } from 'react';

function App() {
  const [resumeText, setResumeText] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [history, setHistory] = useState([]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    try {
      if (file.name.endsWith('.pdf')) {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
        const pdfjs = window.pdfjsLib;
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(' ') + '\n';
        }
        setResumeText(fullText);
      } else {
        const text = await file.text();
        setResumeText(text);
      }
    } catch(err) {
      setError('Error reading file: ' + err.message);
    }
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
      const prompt = "Analyze this resume" + (jobDesc ? " against this job description: " + jobDesc : "") + ". Return ONLY valid JSON: {\"ats_score\": 75, \"strengths\": [\"example\"], \"weaknesses\": [\"example\"], \"suggestions\": [\"example\"], \"missing_keywords\": [\"example\"], \"matched_keywords\": [\"example\"]}. Resume: " + resumeText;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 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"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      if (!data.choices) {
        setError('API Error: ' + JSON.stringify(data));
        setLoading(false);
        return;
      }
      const txt = data.choices[0].message.content;
      const jsonMatch = txt.match(/\{[\s\S]*\}/);
      const clean = jsonMatch ? jsonMatch[0] : txt;
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setHistory(prev => [{
        date: new Date().toLocaleString(),
        file: fileName,
        score: parsed.ats_score
      }, ...prev].slice(0, 5));
    } catch(err) {
      setError('Error: ' + err.message);
    }
    setLoading(false);
  };

  const downloadResults = () => {
    if (!result) return;
    const content = "RESUME ANALYSIS REPORT\n======================\nDate: " + new Date().toLocaleString() + "\nFile: " + fileName + "\n\nATS SCORE: " + result.ats_score + "/100\n\nSTRENGTHS:\n" + result.strengths.map(s => '- ' + s).join('\n') + "\n\nWEAKNESSES:\n" + result.weaknesses.map(w => '- ' + w).join('\n') + "\n\nSUGGESTIONS:\n" + result.suggestions.map(s => '- ' + s).join('\n') + "\n\nMISSING KEYWORDS:\n" + result.missing_keywords.map(k => '- ' + k).join('\n') + "\n\nMATCHED KEYWORDS:\n" + (result.matched_keywords ? result.matched_keywords.map(k => '- ' + k).join('\n') : 'N/A');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-analysis.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  function getColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  function getLabel(score) {
    if (score >= 80) return 'Excellent!';
    if (score >= 60) return 'Good';
    return 'Needs Work';
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',padding:'40px 20px',fontFamily:'Arial'}}>
      <div style={{textAlign:'center',marginBottom:'40px'}}>
        <h1 style={{color:'white',fontSize:'42px',margin:0,fontWeight:'900'}}>Resume Analyzer</h1>
        <p style={{color:'rgba(255,255,255,0.8)',fontSize:'16px',marginTop:'8px'}}>Upload PDF or TXT — AI powered analysis</p>
      </div>

      <div style={{maxWidth:'800px',margin:'0 auto'}}>
        {history.length > 0 && (
          <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'16px',padding:'20px',marginBottom:'24px'}}>
            <h3 style={{color:'white',margin:'0 0 12px'}}>Score History</h3>
            <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
              {history.map((h,i) => (
                <div key={i} style={{background:'white',borderRadius:'12px',padding:'10px 16px',textAlign:'center'}}>
                  <div style={{fontSize:'22px',fontWeight:'900',color:getColor(h.score)}}>{h.score}</div>
                  <div style={{fontSize:'11px',color:'#64748b'}}>{h.file}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{background:'white',borderRadius:'24px',padding:'40px',boxShadow:'0 25px 50px rgba(0,0,0,0.2)'}}>
          <div style={{background:'#f8fafc',border:'2px dashed #cbd5e1',borderRadius:'16px',padding:'30px',textAlign:'center',marginBottom:'24px',cursor:'pointer'}}
            onClick={() => document.getElementById('fileInput').click()}>
            <p style={{fontSize:'40px',margin:'0 0 8px'}}>📂</p>
            <p style={{color:'#64748b',margin:0}}>{fileName ? 'Uploaded: ' + fileName : 'Click to upload PDF or TXT resume'}</p>
            <p style={{color:'#94a3b8',fontSize:'12px',margin:'4px 0 0'}}>Supports PDF and TXT files</p>
            <input id="fileInput" type="file" accept=".pdf,.txt" onChange={handleFile} style={{display:'none'}}/>
          </div>

          <div style={{marginBottom:'24px'}}>
            <label style={{fontWeight:'700',color:'#374151',display:'block',marginBottom:'8px'}}>Job Description (optional)</label>
            <textarea rows={4} placeholder="Paste job description for keyword matching..."
              value={jobDesc} onChange={e => setJobDesc(e.target.value)}
              style={{width:'100%',padding:'12px',borderRadius:'12px',border:'2px solid #e2e8f0',fontSize:'14px',fontFamily:'Arial',boxSizing:'border-box'}}/>
          </div>

          <button onClick={analyzeResume}
            style={{width:'100%',background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',padding:'16px',border:'none',borderRadius:'12px',fontSize:'18px',fontWeight:'700',cursor:'pointer',marginBottom:'16px'}}>
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </button>

          {result && (
            <button onClick={downloadResults}
              style={{width:'100%',background:'linear-gradient(135deg,#10b981,#059669)',color:'white',padding:'16px',border:'none',borderRadius:'12px',fontSize:'18px',fontWeight:'700',cursor:'pointer',marginBottom:'24px'}}>
              Download Results
            </button>
          )}

          {error && <div style={{background:'#fee2e2',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}><p style={{color:'#dc2626',margin:0}}>{error}</p></div>}

          {result && (
            <div>
              <div style={{textAlign:'center',marginBottom:'32px'}}>
                <div style={{width:'130px',height:'130px',borderRadius:'50%',border:'10px solid',borderColor:getColor(result.ats_score),margin:'0 auto',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:'34px',fontWeight:'900',color:getColor(result.ats_score)}}>{result.ats_score}</span>
                  <span style={{fontSize:'11px',color:'#64748b'}}>ATS Score</span>
                </div>
                <p style={{color:getColor(result.ats_score),fontWeight:'700',fontSize:'18px',marginTop:'10px'}}>{getLabel(result.ats_score)}</p>
              </div>

              {result.matched_keywords && result.matched_keywords.length > 0 && (
                <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:'16px',padding:'20px',marginBottom:'16px'}}>
                  <h3 style={{color:'#16a34a',margin:'0 0 10px'}}>Matched Keywords</h3>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                    {result.matched_keywords.map((k,i) => <span key={i} style={{background:'#dcfce7',color:'#15803d',padding:'4px 12px',borderRadius:'20px',fontSize:'13px'}}>{k}</span>)}
                  </div>
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
                <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:'16px',padding:'20px'}}>
                  <h3 style={{color:'#16a34a',margin:'0 0 10px'}}>Strengths</h3>
                  <ul style={{margin:0,paddingLeft:'16px'}}>{result.strengths.map((s,i) => <li key={i} style={{color:'#15803d',fontSize:'14px',marginBottom:'4px'}}>{s}</li>)}</ul>
                </div>
                <div style={{background:'#fff7ed',border:'1px solid #fdba74',borderRadius:'16px',padding:'20px'}}>
                  <h3 style={{color:'#ea580c',margin:'0 0 10px'}}>Weaknesses</h3>
                  <ul style={{margin:0,paddingLeft:'16px'}}>{result.weaknesses.map((w,i) => <li key={i} style={{color:'#c2410c',fontSize:'14px',marginBottom:'4px'}}>{w}</li>)}</ul>
                </div>
              </div>

              <div style={{background:'#eff6ff',border:'1px solid #93c5fd',borderRadius:'16px',padding:'20px',marginBottom:'16px'}}>
                <h3 style={{color:'#2563eb',margin:'0 0 10px'}}>Suggestions</h3>
                <ul style={{margin:0,paddingLeft:'16px'}}>{result.suggestions.map((s,i) => <li key={i} style={{color:'#1d4ed8',fontSize:'14px',marginBottom:'4px'}}>{s}</li>)}</ul>
              </div>

              <div style={{background:'#fdf4ff',border:'1px solid #e879f9',borderRadius:'16px',padding:'20px'}}>
                <h3 style={{color:'#a21caf',margin:'0 0 10px'}}>Missing Keywords</h3>
                <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                  {result.missing_keywords.map((k,i) => <span key={i} style={{background:'#fae8ff',color:'#86198f',padding:'4px 12px',borderRadius:'20px',fontSize:'13px'}}>{k}</span>)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;