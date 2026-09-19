const fileInput = document.getElementById('fileInput');
const resumeText = document.getElementById('resumeText');
const jobText = document.getElementById('jobText');
const analyzeBtn = document.getElementById('analyzeBtn');
const results = document.getElementById('results');
const scoreValue = document.getElementById('scoreValue');
const barFill = document.getElementById('barFill');
const matchedCount = document.getElementById('matchedCount');
const matchedList = document.getElementById('matchedList');
const missingCount = document.getElementById('missingCount');
const missingList = document.getElementById('missingList');

const STOP_WORDS = new Set([
  'the','and','for','with','you','are','this','that','from','have','will',
  'your','our','their','they','but','not','can','all','any','has','was',
  'were','been','being','would','could','should','may','might','must',
  'shall','into','such','than','then','them','these','those','there','here'
]);

function extractKeywords(text) {
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s+#.-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  )];
}

function analyze() {
  const resume = resumeText.value.trim();
  const job = jobText.value.trim();

  if (!resume || !job) {
    alert('Please provide both a resume and a job description.');
    return;
  }

  const jobKeywords = extractKeywords(job);
  const resumeLower = resume.toLowerCase();

  const matched = jobKeywords.filter(k => resumeLower.includes(k));
  const missing = jobKeywords.filter(k => !resumeLower.includes(k));
  const score = jobKeywords.length
    ? Math.round((matched.length / jobKeywords.length) * 100)
    : 0;

  scoreValue.textContent = score;
  barFill.style.width = score + '%';
  matchedCount.textContent = matched.length;
  missingCount.textContent = missing.length;
  matchedList.textContent = matched.join(', ') || 'None';
  missingList.textContent = missing.join(', ') || 'None';

  results.classList.remove('hidden');
}

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    if (file.type === 'application/pdf') {
      const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(' ') + '\n';
      }

      if (!text.trim()) {
        alert('This PDF appears to be image-based (no text layer). Try exporting a text-based PDF or paste the text manually.');
        return;
      }

      resumeText.value = text;
    } else if (file.name.endsWith('.docx')) {
      const mammoth = await import('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js');
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      resumeText.value = result.value;
    } else {
      alert('Unsupported file type. Please use PDF or DOCX.');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to parse the file. Try pasting the text manually.');
  }
});

analyzeBtn.addEventListener('click', analyze);
