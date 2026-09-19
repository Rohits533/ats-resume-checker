import { supabase, signUp, signIn, signOut, getSession } from "./auth.js";

const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authMsg = document.getElementById('authMsg');
const signupBtn = document.getElementById('signupBtn');
const skipAuth = document.getElementById('skipAuth');
const userBar = document.getElementById('userBar');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');

const fileInput = document.getElementById('fileInput');
const resumeText = document.getElementById('resumeText');
const jobTitle = document.getElementById('jobTitle');
const jobText = document.getElementById('jobText');
const analyzeBtn = document.getElementById('analyzeBtn');
const results = document.getElementById('results');
const scoreValue = document.getElementById('scoreValue');
const barFill = document.getElementById('barFill');
const matchedCount = document.getElementById('matchedCount');
const matchedList = document.getElementById('matchedList');
const missingCount = document.getElementById('missingCount');
const missingList = document.getElementById('missingList');
const saveMsg = document.getElementById('saveMsg');

let currentUser = null;

function showApp(user) {
  currentUser = user;
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  if (user) {
    userBar.classList.remove('hidden');
    userEmail.textContent = user.email;
    loadHistory();
  } else {
    userBar.classList.add('hidden');
    historySection.classList.add('hidden');
  }
}

function showAuth() {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
  userBar.classList.add('hidden');
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authMsg.textContent = '';
  try {
    await signIn(authEmail.value, authPassword.value);
  } catch (err) {
    authMsg.textContent = err.message;
  }
});

signupBtn.addEventListener('click', async () => {
  authMsg.textContent = '';
  try {
    await signUp(authEmail.value, authPassword.value);
    authMsg.textContent = 'Check your email to confirm, then log in.';
  } catch (err) {
    authMsg.textContent = err.message;
  }
});

skipAuth.addEventListener('click', (e) => {
  e.preventDefault();
  showApp(null);
});

logoutBtn.addEventListener('click', async () => {
  await signOut();
  showAuth();
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) showApp(session.user);
  else showAuth();
});

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

function renderChips(container, words, delayMs = 30) {
  if (!words.length) {
    container.innerHTML = '<span style="background:transparent;border:none;color:#64748b;animation:none">None</span>';
    return;
  }
  container.innerHTML = words
    .map((k, i) => `<span style="animation-delay:${i * delayMs}ms">${k}</span>`)
    .join('');
}

async function analyze() {
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
  const score = jobKeywords.length ? Math.round((matched.length / jobKeywords.length) * 100) : 0;

  scoreValue.textContent = score;
  barFill.style.width = score + '%';
  matchedCount.textContent = matched.length;
  missingCount.textContent = missing.length;
  renderChips(matchedList, matched);
  renderChips(missingList, missing);
  results.classList.remove('hidden');

  if (currentUser) {
    saveMsg.textContent = 'Saving...';
    try {
      const { data: resumeRow, error: rErr } = await supabase
        .from('resumes')
        .insert({ user_id: currentUser.id, filename: fileInput.files[0]?.name || 'pasted', content: resume })
        .select()
        .single();
      if (rErr) throw rErr;

      const { error: aErr } = await supabase
        .from('analyses')
        .insert({
          user_id: currentUser.id,
          resume_id: resumeRow.id,
          job_title: jobTitle.value.trim() || null,
          job_description: job,
          score,
          matched_keywords: matched,
          missing_keywords: missing
        });
      if (aErr) throw aErr;

      saveMsg.textContent = '✓ Saved to your account';
      loadHistory();
    } catch (err) {
      console.error(err);
      saveMsg.textContent = 'Could not save: ' + err.message;
    }
  } else {
    saveMsg.textContent = 'Sign in to save this analysis.';
  }
}

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.type === 'application/pdf') {
      const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(' ') + '\n';
      }
      if (!text.trim()) {
        alert('This PDF appears to be image-based. Paste the text manually instead.');
        return;
      }
      resumeText.value = text;
    } else if (file.name.endsWith('.docx')) {
      const mammoth = await import('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js');
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      resumeText.value = result.value;
    } else {
      alert('Unsupported file type.');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to parse file. Paste text manually.');
  }
});

analyzeBtn.addEventListener('click', analyze);

async function loadHistory() {
  if (!currentUser) return;
  const { data, error } = await supabase
    .from('analyses')
    .select('id, job_title, score, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) { console.error(error); return; }
  if (!data || data.length === 0) {
    historySection.classList.add('hidden');
    return;
  }
  historySection.classList.remove('hidden');
  historyList.innerHTML = data.map((row, i) => `
    <div class="history-item" style="animation-delay:${i * 40}ms">
      <strong>${row.job_title || 'Untitled job'}</strong>
      <span class="history-score">${row.score}%</span>
      <time>${new Date(row.created_at).toLocaleDateString()}</time>
    </div>
  `).join('');
}

(async () => {
  const session = await getSession();
  if (session) showApp(session.user);
  else showAuth();
})();
