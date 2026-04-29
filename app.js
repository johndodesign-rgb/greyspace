// NeuroSync Scratchpad App
class GreyspaceApp {
    constructor() {
        this.scratchpad = document.getElementById('scratchpad');
        this.saveBtn = document.getElementById('save-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.voiceBtn = document.getElementById('voice-btn');
        this.photoBtn = document.getElementById('photo-btn');
        this.photoInput = document.getElementById('photo-input');
        this.recordingStatus = document.getElementById('recording-status');
        this.capturesList = document.getElementById('captures-list');
        this.searchInput = document.getElementById('search-input');
        
        // Voice recording state
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        
        // Speech recognition
        this.recognition = null;
        this.transcript = '';
        this.transcriptionFailed = false;
        this.initSpeechRecognition();
        
        this.init();
    }

    initSpeechRecognition() {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                this.transcript = (this.transcript + finalTranscript).trim();
                
                // Update status with interim results
                if (interimTranscript && this.isRecording) {
                    this.recordingStatus.innerHTML = `
                        <div style="font-size: 0.75rem; font-style: italic; color: var(--text-light); margin-top: 0.5rem;">
                            ${this.escapeHtml(interimTranscript)}...
                        </div>
                    `;
                }
            };
            
            this.recognition.onerror = (event) => {
                console.warn('Speech recognition error:', event.error);
                // Mark that transcription failed but don't break the app
                if (event.error === 'network') {
                    console.log('Transcription unavailable - requires HTTPS connection');
                }
                this.transcriptionFailed = true;
            };
        } else {
            console.log('Speech recognition not supported in this browser');
        }
    }

    init() {
        // Load saved captures
        this.renderCaptures();
        
        // Event listeners
        this.saveBtn.addEventListener('click', () => this.saveCapture());
        this.clearBtn.addEventListener('click', () => this.clearScratchpad());
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
        this.photoBtn.addEventListener('click', () => this.photoInput.click());
        this.photoInput.addEventListener('change', (e) => this.handlePhotoCapture(e));
        
        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        // Save on Enter + Cmd/Ctrl
        this.scratchpad.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                this.saveCapture();
            }
        });
    }

    async toggleVoiceRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.transcript = '';
            this.transcriptionFailed = false;

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.saveVoiceMemo(audioBlob);
                
                // Stop all tracks to turn off microphone
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.voiceBtn.classList.add('recording');
            this.voiceBtn.innerHTML = '⏹️ Stop';
            this.voiceBtn.title = 'Stop recording';
            
            // Try to start speech recognition
            if (this.recognition) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.log('Speech recognition could not start:', e.message);
                    this.transcriptionFailed = true;
                }
            } else {
                this.transcriptionFailed = true;
            }
            
            // Start timer display
            this.updateRecordingTimer();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check your permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.voiceBtn.classList.remove('recording');
            this.voiceBtn.innerHTML = '🎤 Record';
            this.voiceBtn.title = 'Record voice memo';
            
            // Stop speech recognition
            if (this.recognition) {
                try {
                    this.recognition.stop();
                } catch (e) {
                    console.log('Speech recognition already stopped');
                }
            }
            
            // Clear timer
            if (this.recordingTimer) {
                clearTimeout(this.recordingTimer);
                this.recordingTimer = null;
            }
            this.recordingStatus.textContent = '';
            this.recordingStatus.classList.remove('active');
        }
    }

    updateRecordingTimer() {
        if (!this.isRecording) return;
        
        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        this.recordingStatus.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.recordingStatus.classList.add('active');
        
        this.recordingTimer = setTimeout(() => this.updateRecordingTimer(), 1000);
    }

    async saveVoiceMemo(audioBlob) {
        // Convert blob to base64 for storage
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const base64Audio = reader.result;
            
            // Determine transcript message
            let transcriptText;
            if (this.transcript && this.transcript.trim()) {
                transcriptText = this.transcript.trim();
            } else if (this.transcriptionFailed) {
                transcriptText = '(Transcription unavailable - requires HTTPS connection. You can type the transcript here.)';
            } else {
                transcriptText = '(No speech detected. You can type the transcript here.)';
            }
            
            const capture = {
                id: Date.now(),
                type: 'voice',
                audio: base64Audio,
                transcript: transcriptText,
                duration: null,
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleDateString()
            };

            // Get existing captures
            const captures = this.getCaptures();
            captures.unshift(capture);
            
            // Save to localStorage
            localStorage.setItem('neurosync_captures', JSON.stringify(captures));
            
            // Re-render
            this.renderCaptures();
            
            // Reset transcript
            this.transcript = '';
        };
    }

    handlePhotoCapture(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Image = e.target.result;
            
            const capture = {
                id: Date.now(),
                type: 'photo',
                image: base64Image,
                caption: '',
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleDateString()
            };

            // Get existing captures
            const captures = this.getCaptures();
            captures.unshift(capture);
            
            // Save to localStorage
            localStorage.setItem('neurosync_captures', JSON.stringify(captures));
            
            // Re-render
            this.renderCaptures();
            
            // Reset input
            event.target.value = '';
        };
        
        reader.readAsDataURL(file);
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (searchTerm === '') {
            // Show all captures
            this.renderCaptures();
            return;
        }

        // Filter captures by search term (including voice transcripts)
        const allCaptures = this.getCaptures();
        const filteredCaptures = allCaptures.filter(capture => {
            if (capture.type === 'voice') {
                return capture.transcript && capture.transcript.toLowerCase().includes(searchTerm);
            } else {
                return capture.text.toLowerCase().includes(searchTerm);
            }
        });

        if (filteredCaptures.length === 0) {
            this.capturesList.innerHTML = `
                <div class="empty-state">
                    No captures found matching "${this.escapeHtml(query)}"
                </div>
            `;
            return;
        }

        // Render filtered results without grouping
        this.capturesList.innerHTML = `
            <div class="capture-group expanded">
                <h3 class="group-header">
                    Search Results (${filteredCaptures.length})
                </h3>
                <div class="group-content" style="display: block;">
                    ${filteredCaptures.map(capture => {
                        if (capture.type === 'voice') {
                            return `
                                <div class="capture-item voice-memo">
                                    <div class="capture-time">🎤 Voice Memo • ${this.formatTime(capture.timestamp)} • ${this.formatDate(capture.timestamp)}</div>
                                    <audio controls src="${capture.audio}" class="audio-player"></audio>
                                    <div class="transcript-container">
                                        <div class="transcript-label">Transcript:</div>
                                        <div class="transcript-text">${this.highlightSearchTerm(capture.transcript || '(no transcript)', searchTerm)}</div>
                                    </div>
                                    <div class="capture-actions">
                                        <button class="btn-small btn-delete" onclick="app.deleteCapture(${capture.id})">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="capture-item">
                                    <div class="capture-time">${this.formatTime(capture.timestamp)} • ${this.formatDate(capture.timestamp)}</div>
                                    <div class="capture-text">${this.highlightSearchTerm(capture.text, searchTerm)}</div>
                                    <div class="capture-actions">
                                        <button class="btn-small btn-delete" onclick="app.deleteCapture(${capture.id})">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
            </div>
        `;
    }

    highlightSearchTerm(text, searchTerm) {
        const escapedText = this.escapeHtml(text);
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return escapedText.replace(regex, '<mark>$1</mark>');
    }

    saveCapture() {
        const text = this.scratchpad.value.trim();
        
        if (!text) {
            return;
        }

        const capture = {
            id: Date.now(),
            text: text,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString()
        };

        // Get existing captures
        const captures = this.getCaptures();
        captures.unshift(capture); // Add to beginning
        
        // Save to localStorage
        localStorage.setItem('neurosync_captures', JSON.stringify(captures));
        
        // Clear scratchpad and re-render
        this.scratchpad.value = '';
        this.renderCaptures();
        
        // Focus back on scratchpad
        this.scratchpad.focus();
    }

    clearScratchpad() {
        if (this.scratchpad.value.trim() && !confirm('Clear current text?')) {
            return;
        }
        this.scratchpad.value = '';
        this.scratchpad.focus();
    }

    getCaptures() {
        const stored = localStorage.getItem('neurosync_captures');
        return stored ? JSON.parse(stored) : [];
    }

    getTodaysCaptures() {
        const captures = this.getCaptures();
        const today = new Date().toLocaleDateString();
        return captures.filter(c => c.date === today);
    }

    deleteCapture(id) {
        if (!confirm('Delete this capture?')) {
            return;
        }

        const captures = this.getCaptures();
        const filtered = captures.filter(c => c.id !== id);
        localStorage.setItem('neurosync_captures', JSON.stringify(filtered));
        this.renderCaptures();
    }

    formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }

    groupCapturesByPeriod() {
        const captures = this.getCaptures();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        const groups = {
            today: [],
            yesterday: [],
            thisWeek: [],
            lastWeek: [],
            thisMonth: [],
            older: []
        };

        captures.forEach(capture => {
            const captureDate = new Date(capture.timestamp);
            const captureDateOnly = new Date(captureDate.getFullYear(), captureDate.getMonth(), captureDate.getDate());
            
            if (captureDateOnly.getTime() === today.getTime()) {
                groups.today.push(capture);
            } else if (captureDateOnly.getTime() === yesterday.getTime()) {
                groups.yesterday.push(capture);
            } else if (captureDate >= weekAgo) {
                groups.thisWeek.push(capture);
            } else if (captureDate >= new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000)) {
                groups.lastWeek.push(capture);
            } else if (captureDate >= monthAgo) {
                groups.thisMonth.push(capture);
            } else {
                groups.older.push(capture);
            }
        });

        return groups;
    }

    renderCaptures() {
        const groups = this.groupCapturesByPeriod();
        const allCaptures = this.getCaptures();
        
        if (allCaptures.length === 0) {
            this.capturesList.innerHTML = `
                <div class="empty-state">
                    No captures yet. Start writing above!
                </div>
            `;
            return;
        }

        let html = '';

        // Today - always expanded
        if (groups.today.length > 0) {
            html += this.renderGroup('Today', groups.today, true);
        }

        // Yesterday - collapsible
        if (groups.yesterday.length > 0) {
            html += this.renderGroup('Yesterday', groups.yesterday, false);
        }

        // This Week - collapsible
        if (groups.thisWeek.length > 0) {
            html += this.renderGroup('This Week', groups.thisWeek, false);
        }

        // Last Week - collapsible
        if (groups.lastWeek.length > 0) {
            html += this.renderGroup('Last Week', groups.lastWeek, false);
        }

        // This Month - collapsible
        if (groups.thisMonth.length > 0) {
            html += this.renderGroup('Earlier This Month', groups.thisMonth, false);
        }

        // Older - collapsible
        if (groups.older.length > 0) {
            html += this.renderGroup('Older', groups.older, false);
        }

        this.capturesList.innerHTML = html;
    }

    renderGroup(title, captures, expanded = false) {
        const groupId = title.replace(/\s+/g, '-').toLowerCase();
        const expandedClass = expanded ? 'expanded' : '';
        const displayStyle = expanded ? 'block' : 'none';
        
        return `
            <div class="capture-group ${expandedClass}">
                <h3 class="group-header" onclick="app.toggleGroup('${groupId}')">
                    <span class="toggle-icon">${expanded ? '▼' : '▶'}</span>
                    ${title} (${captures.length})
                </h3>
                <div id="${groupId}" class="group-content" style="display: ${displayStyle};">
                    ${captures.map(capture => this.renderCaptureItem(capture)).join('')}
                </div>
            </div>
        `;
    }

    renderCaptureItem(capture) {
        if (capture.type === 'voice') {
            return `
                <div class="capture-item voice-memo">
                    <div class="capture-time">🎤 Voice Memo • ${this.formatTime(capture.timestamp)} • ${this.formatDate(capture.timestamp)}</div>
                    <audio controls src="${capture.audio}" class="audio-player"></audio>
                    <div class="transcript-container">
                        <div class="transcript-label">Transcript:</div>
                        <div class="transcript-text" 
                             contenteditable="true" 
                             data-capture-id="${capture.id}"
                             onblur="app.updateTranscript(${capture.id}, this.textContent)">${this.escapeHtml(capture.transcript || '(no transcript)')}</div>
                    </div>
                    <div class="capture-actions">
                        <button class="btn-small btn-delete" onclick="app.deleteCapture(${capture.id})">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        } else if (capture.type === 'photo') {
            const captionId = `caption-${capture.id}`;
            return `
                <div class="capture-item photo-capture-item">
                    <div class="capture-time">📷 Photo • ${this.formatTime(capture.timestamp)} • ${this.formatDate(capture.timestamp)}</div>
                    <img src="${capture.image}" alt="Captured photo" class="photo-thumbnail" onclick="app.viewFullPhoto('${capture.image}')">
                    <div class="caption-container">
                        <textarea 
                            id="${captionId}" 
                            class="caption-edit"
                            placeholder="Add a caption or notes about this photo..."
                            onblur="app.updateCaption(${capture.id}, this.value)"
                        >${this.escapeHtml(capture.caption || '')}</textarea>
                    </div>
                    <div class="capture-actions">
                        <button class="btn-small btn-delete" onclick="app.deleteCapture(${capture.id})">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="capture-item">
                    <div class="capture-time">${this.formatTime(capture.timestamp)} • ${this.formatDate(capture.timestamp)}</div>
                    <div class="capture-text">${this.escapeHtml(capture.text)}</div>
                    <div class="capture-actions">
                        <button class="btn-small btn-delete" onclick="app.deleteCapture(${capture.id})">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }
    }

    updateCaption(captureId, newCaption) {
        const captures = this.getCaptures();
        const capture = captures.find(c => c.id === captureId);
        
        if (capture) {
            capture.caption = newCaption;
            localStorage.setItem('neurosync_captures', JSON.stringify(captures));
        }
    }

    viewFullPhoto(imageSrc) {
        // Open photo in new tab/window
        const win = window.open();
        win.document.write(`
            <html>
                <head><title>Photo Capture</title></head>
                <body style="margin:0;display:flex;align-items:center;justify-content:center;background:#000;">
                    <img src="${imageSrc}" style="max-width:100%;max-height:100vh;">
                </body>
            </html>
        `);
    }

    updateTranscript(captureId, newTranscript) {
        const captures = this.getCaptures();
        const capture = captures.find(c => c.id === captureId);
        
        if (capture && capture.type === 'voice') {
            capture.transcript = newTranscript.trim();
            localStorage.setItem('neurosync_captures', JSON.stringify(captures));
        }
    }

    toggleGroup(groupId) {
        const content = document.getElementById(groupId);
        const header = content.previousElementSibling;
        const icon = header.querySelector('.toggle-icon');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.textContent = '▼';
        } else {
            content.style.display = 'none';
            icon.textContent = '▶';
        }
    }

    formatDate(isoString) {
        const date = new Date(isoString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toLocaleDateString() === today.toLocaleDateString()) {
            return 'Today';
        } else if (date.toLocaleDateString() === yesterday.toLocaleDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Test function to populate sample captures
}

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new GreyspaceApp();
    });
} else {
    app = new GreyspaceApp();
}

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/greyspace/service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed'));
    });
}
