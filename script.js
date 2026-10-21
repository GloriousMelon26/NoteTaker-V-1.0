const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const liveTranscript = document.getElementById('liveTranscript');
const formattedNote = document.getElementById('formattedNote');
const notesHistory = document.getElementById('notesHistory');

let recognition;
let finalTranscript = '';
let isListening = false;
let silenceTimer = null;
const SILENCE_THRESHOLD_MS = 1500; 

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        clearTimeout(silenceTimer);
        let interimTranscript = '';
        let freshFinalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                freshFinalText += event.results[i].transcript;
            } else {
                interimTranscript += event.results[i].transcript;
            }
        }

        if (freshFinalText) {
            finalTranscript += freshFinalText;
            silenceTimer = setTimeout(() => { handleSilenceDetected(); }, SILENCE_THRESHOLD_MS);
        }

        liveTranscript.textContent = finalTranscript + interimTranscript;
        liveTranscript.scrollTop = liveTranscript.scrollHeight;
    };

    recognition.onerror = (e) => {
        console.error(e);
        updateStatus('Error: ' + e.error, 'text-red-400');
        toggleButtons(false);
    };

    recognition.onend = () => { if (isListening) recognition.start(); };
} else {
    startBtn.disabled = true;
    liveTranscript.textContent = "Voice input is not supported in this browser. Please run this in Google Chrome or Safari.";
}

function handleSilenceDetected() {
    if (!finalTranscript.trim()) return;
    let cleaned = finalTranscript.trim();
    if (!cleaned.endsWith('\n\n')) { finalTranscript = cleaned + '\n\n• '; }
    formattedNote.value = finalTranscript;
    updateStatus('Added item via pause', 'text-indigo-400');
    setTimeout(() => { if(isListening) updateStatus('Listening...', 'text-red-500 animate-pulse'); }, 800);
}

startBtn.addEventListener('click', () => {
    if (!recognition) return;
    finalTranscript = '• ';
    liveTranscript.textContent = '';
    formattedNote.value = '';
    recognition.start();
    isListening = true;
    toggleButtons(true);
    updateStatus('Listening...', 'text-red-500 animate-pulse');
    liveTranscript.classList.add('glow');
});

stopBtn.addEventListener('click', () => {
    if (!recognition || !isListening) return;
    clearTimeout(silenceTimer);
    isListening = false;
    recognition.stop();
    toggleButtons(false);
    liveTranscript.classList.remove('glow');
    let finishedText = finalTranscript.trim();
    if (finishedText.endsWith('•')) { finishedText = finishedText.slice(0, -1).trim(); }
    formattedNote.value = finishedText;
    updateStatus('Ready', 'text-amber-400');
});

document.getElementById('clearBtn').addEventListener('click', () => {
    clearTimeout(silenceTimer);
    liveTranscript.textContent = 'Click "Start Listening" and talk normally...';
    formattedNote.value = '';
    finalTranscript = '';
    updateStatus('Ready', 'text-amber-400');
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const content = formattedNote.value.trim();
    if (!content || content === '•') return alert('No content to archive!');
    const notes = JSON.parse(localStorage.getItem('local_voice_notes') || '[]');
    notes.unshift({ id: Date.now(), text: content, date: new Date().toLocaleString() });
    localStorage.setItem('local_voice_notes', JSON.stringify(notes));
    renderHistory();
    formattedNote.value = '';
    finalTranscript = '';
    liveTranscript.textContent = 'Click "Start Listening" and talk normally...';
});

function toggleButtons(listening) {
    if (listening) {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
    } else {
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
    }
}

function updateStatus(text, colorClass) {
    statusEl.innerHTML = `Status: <span class="${colorClass} font-medium">${text}</span>`;
}

function renderHistory() {
    const notes = JSON.parse(localStorage.getItem('local_voice_notes') || '[]');
    notesHistory.innerHTML = notes.map(n => `
        <div class="bg-slate-800/60 border border-slate-700 p-4 rounded-xl flex flex-col gap-2">
            <div class="text-xs text-slate-500 font-mono font-semibold">${n.date}</div>
            <div class="text-slate-300 text-sm whitespace-pre-wrap">${escapeHTML(n.text)}</div>
        </div>
    `).join('');
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

renderHistory();
