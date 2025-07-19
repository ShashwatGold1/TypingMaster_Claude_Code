const { ipcRenderer } = require('electron');

// Application State
let currentPage = 'quick-test';
let typingTimer = null;
let startTime = null;
let isTyping = false;
let currentWPM = 0;
let currentAccuracy = 100;
let totalCharacters = 0;
let correctCharacters = 0;
let timeLimit = 30;

// Lesson State
let currentLesson = null;
let currentStep = 0;
let lessonSteps = [];
let lessonTimer = null;
let lessonStartTime = null;

// Keyboard Layout for Virtual Keyboard
const keyboardLayout = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
    ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Win', 'Menu', 'Ctrl']
];

// Finger mapping for keys
const fingerMapping = {
    'q': 'left-pinky', 'a': 'left-pinky', 'z': 'left-pinky',
    'w': 'left-ring', 's': 'left-ring', 'x': 'left-ring',
    'e': 'left-middle', 'd': 'left-middle', 'c': 'left-middle',
    'r': 'left-index', 'f': 'left-index', 'v': 'left-index',
    't': 'left-index', 'g': 'left-index', 'b': 'left-index',
    'y': 'right-index', 'h': 'right-index', 'n': 'right-index',
    'u': 'right-index', 'j': 'right-index', 'm': 'right-index',
    'i': 'right-middle', 'k': 'right-middle', ',': 'right-middle',
    'o': 'right-ring', 'l': 'right-ring', '.': 'right-ring',
    'p': 'right-pinky', ';': 'right-pinky', '/': 'right-pinky',
    "'": 'right-pinky', '[': 'right-pinky', ']': 'right-pinky'
};

// Lesson Data
const lessons = {
    'home-row': {
        title: 'Home Row Basics',
        description: 'Learn the foundation keys: A, S, D, F, J, K, L, ;',
        steps: [
            {
                instruction: 'Place your fingers on the home row keys: A, S, D, F for left hand and J, K, L, ; for right hand.',
                text: 'asdf jkl;',
                repeat: 3
            },
            {
                instruction: 'Practice individual finger movements. Type each letter slowly and return to home position.',
                text: 'a s d f j k l ;',
                repeat: 2
            },
            {
                instruction: 'Type letter combinations to build muscle memory.',
                text: 'as df jk l; fd sa kl ;j',
                repeat: 2
            },
            {
                instruction: 'Practice simple words using only home row keys.',
                text: 'ask dad sad falllass;',
                repeat: 2
            },
            {
                instruction: 'Complete sentences with home row keys only.',
                text: 'dad asks; falllass; sad lass asks dad;',
                repeat: 1
            }
        ]
    },
    'top-row': {
        title: 'Top Row Introduction',
        description: 'Add the top row keys: Q, W, E, R, T, Y, U, I, O, P',
        steps: [
            {
                instruction: 'Learn the top row keys. Keep your fingers anchored on home row and reach up.',
                text: 'qwert yuiop',
                repeat: 3
            },
            {
                instruction: 'Practice reaching from home row to top row and back.',
                text: 'qa sw de fr ju ki lo p;',
                repeat: 2
            },
            {
                instruction: 'Type common letter combinations.',
                text: 'qu we er ty ui io op',
                repeat: 2
            },
            {
                instruction: 'Practice words combining home and top rows.',
                text: 'quite power typed folder',
                repeat: 2
            }
        ]
    }
};

// Sample texts for quick test
const sampleTexts = [
    "Cooking is both an art and a science. It involves understanding ingredients, mastering techniques, and creating delicious meals that nourish the body and bring joy to those who share them.",
    "Technology has revolutionized the way we communicate, learn, and work. From smartphones to artificial intelligence, these innovations continue to shape our daily lives in remarkable ways.",
    "Reading opens doors to new worlds and perspectives. Through books, we can travel to distant places, learn from great minds, and develop our imagination and critical thinking skills.",
    "Exercise is essential for maintaining good health and well-being. Regular physical activity strengthens the body, improves mental health, and increases energy levels throughout the day."
];

// DOM Elements
let elements = {};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    createVirtualKeyboard();
    showPage('quick-test');
    setRandomText();
});

function initializeElements() {
    // Title bar controls
    elements.minimizeBtn = document.getElementById('minimizeBtn');
    elements.maximizeBtn = document.getElementById('maximizeBtn');
    elements.closeBtn = document.getElementById('closeBtn');
    
    // Quick test elements
    elements.wpmDisplay = document.getElementById('wpm');
    elements.accuracyDisplay = document.getElementById('accuracy');
    elements.timeDisplay = document.getElementById('time');
    elements.textDisplay = document.getElementById('textDisplay');
    elements.typingInput = document.getElementById('typingInput');
    elements.resetBtn = document.getElementById('resetBtn');
    elements.timeSelect = document.getElementById('timeSelect');
    
    // Lesson elements
    elements.lessonTitle = document.getElementById('lessonTitle');
    elements.lessonProgress = document.getElementById('lessonProgress');
    elements.progressText = document.getElementById('progressText');
    elements.lessonInstruction = document.getElementById('lessonInstruction');
    elements.lessonText = document.getElementById('lessonText');
    elements.lessonInput = document.getElementById('lessonInput');
    elements.lessonWPM = document.getElementById('lessonWPM');
    elements.lessonAccuracy = document.getElementById('lessonAccuracy');
    elements.lessonErrors = document.getElementById('lessonErrors');
    elements.prevStep = document.getElementById('prevStep');
    elements.nextStep = document.getElementById('nextStep');
    elements.backToLessons = document.getElementById('backToLessons');
    
    // Virtual keyboard
    elements.virtualKeyboard = document.getElementById('virtualKeyboard');
}

function setupEventListeners() {
    // Title bar controls
    elements.minimizeBtn.addEventListener('click', () => ipcRenderer.invoke('window-minimize'));
    elements.maximizeBtn.addEventListener('click', () => ipcRenderer.invoke('window-maximize'));
    elements.closeBtn.addEventListener('click', () => ipcRenderer.invoke('window-close'));
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            if (page) {
                showPage(page);
                updateActiveMenuItem(this);
            }
        });
    });
    
    // Quick test controls
    elements.resetBtn.addEventListener('click', resetTest);
    elements.timeSelect.addEventListener('change', function() {
        timeLimit = parseInt(this.value);
        resetTest();
    });
    
    // Typing input
    elements.typingInput.addEventListener('input', handleTyping);
    elements.typingInput.addEventListener('focus', startTest);
    
    // Lesson controls
    elements.prevStep.addEventListener('click', previousStep);
    elements.nextStep.addEventListener('click', nextStep);
    elements.backToLessons.addEventListener('click', () => showPage('lessons'));
    
    // Lesson input
    elements.lessonInput.addEventListener('input', handleLessonTyping);
    elements.lessonInput.addEventListener('focus', startLessonTimer);
    
    // Lesson buttons
    document.querySelectorAll('.lesson-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lessonCard = this.closest('.lesson-card');
            const lessonKey = lessonCard.dataset.lesson;
            if (lessonKey && !lessonCard.classList.contains('locked')) {
                startLesson(lessonKey);
            }
        });
    });
}

function createVirtualKeyboard() {
    if (!elements.virtualKeyboard) return;
    
    elements.virtualKeyboard.innerHTML = '';
    
    keyboardLayout.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.className = 'keyboard-row';
        
        row.forEach(key => {
            const keyElement = document.createElement('div');
            keyElement.className = 'key';
            keyElement.textContent = key;
            keyElement.dataset.key = key.toLowerCase();
            
            // Add special classes for different key sizes
            if (key === 'Space') {
                keyElement.classList.add('space');
            } else if (['Tab', 'CapsLock', 'Enter', 'Shift'].includes(key)) {
                keyElement.classList.add('wide');
            } else if (key === 'Backspace') {
                keyElement.classList.add('extra-wide');
            }
            
            rowElement.appendChild(keyElement);
        });
        
        elements.virtualKeyboard.appendChild(rowElement);
    });
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageId;
    }
}

function updateActiveMenuItem(activeItem) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

function setRandomText() {
    const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    elements.textDisplay.textContent = randomText;
}

function startTest() {
    if (!isTyping) {
        isTyping = true;
        startTime = Date.now();
        
        typingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            elements.timeDisplay.textContent = elapsed;
            
            if (elapsed >= timeLimit) {
                endTest();
            }
        }, 1000);
    }
}

function handleTyping() {
    if (!isTyping) return;
    
    const typed = elements.typingInput.value;
    const target = elements.textDisplay.textContent;
    
    totalCharacters = typed.length;
    correctCharacters = 0;
    
    // Create highlighted text
    let highlightedText = '';
    for (let i = 0; i < target.length; i++) {
        if (i < typed.length) {
            if (typed[i] === target[i]) {
                correctCharacters++;
                highlightedText += `<span class="correct">${target[i]}</span>`;
            } else {
                highlightedText += `<span class="incorrect">${target[i]}</span>`;
            }
        } else if (i === typed.length) {
            highlightedText += `<span class="current">${target[i]}</span>`;
        } else {
            highlightedText += target[i];
        }
    }
    
    elements.textDisplay.innerHTML = highlightedText;
    
    // Update stats
    updateStats();
    
    // Highlight current key on virtual keyboard
    if (typed.length < target.length) {
        highlightKey(target[typed.length].toLowerCase());
    }
    
    // Check if test is complete
    if (typed.length >= target.length) {
        endTest();
    }
}

function updateStats() {
    // Calculate WPM
    if (startTime) {
        const timeElapsed = (Date.now() - startTime) / 1000 / 60; // minutes
        currentWPM = Math.round((correctCharacters / 5) / timeElapsed) || 0;
    }
    
    // Calculate accuracy
    currentAccuracy = totalCharacters > 0 ? Math.round((correctCharacters / totalCharacters) * 100) : 100;
    
    // Update display
    elements.wpmDisplay.textContent = currentWPM;
    elements.accuracyDisplay.textContent = currentAccuracy + '%';
}

function endTest() {
    isTyping = false;
    if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
    }
    
    // Remove keyboard highlighting
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('active', 'correct', 'incorrect');
    });
}

function resetTest() {
    isTyping = false;
    if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
    }
    
    elements.typingInput.value = '';
    elements.timeDisplay.textContent = '0';
    elements.wpmDisplay.textContent = '0';
    elements.accuracyDisplay.textContent = '100%';
    
    totalCharacters = 0;
    correctCharacters = 0;
    startTime = null;
    
    setRandomText();
    
    // Remove keyboard highlighting
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('active', 'correct', 'incorrect');
    });
}

function highlightKey(key) {
    // Remove previous highlights
    document.querySelectorAll('.key').forEach(k => {
        k.classList.remove('active');
    });
    
    // Highlight current key
    const keyElement = document.querySelector(`[data-key="${key}"]`);
    if (keyElement) {
        keyElement.classList.add('active');
    }
    
    // Highlight finger
    highlightFinger(key);
}

function highlightFinger(key) {
    // Remove previous finger highlights
    document.querySelectorAll('.finger').forEach(finger => {
        finger.classList.remove('active');
    });
    
    // Highlight correct finger
    const fingerType = fingerMapping[key];
    if (fingerType) {
        const fingerElement = document.querySelector(`[data-finger="${fingerType}"]`);
        if (fingerElement) {
            fingerElement.classList.add('active');
        }
    }
}

function startLesson(lessonKey) {
    const lesson = lessons[lessonKey];
    if (!lesson) return;
    
    currentLesson = lessonKey;
    currentStep = 0;
    lessonSteps = lesson.steps;
    
    elements.lessonTitle.textContent = lesson.title;
    showPage('lesson-practice');
    loadLessonStep();
}

function loadLessonStep() {
    if (currentStep >= lessonSteps.length) {
        completeLession();
        return;
    }
    
    const step = lessonSteps[currentStep];
    
    elements.lessonInstruction.textContent = step.instruction;
    elements.lessonText.textContent = step.text;
    elements.lessonInput.value = '';
    elements.progressText.textContent = `Step ${currentStep + 1} of ${lessonSteps.length}`;
    
    // Update progress bar
    const progress = ((currentStep + 1) / lessonSteps.length) * 100;
    elements.lessonProgress.style.width = progress + '%';
    
    // Update button states
    elements.prevStep.disabled = currentStep === 0;
    elements.nextStep.textContent = currentStep === lessonSteps.length - 1 ? 'Complete' : 'Next Step';
    
    // Reset lesson stats
    resetLessonStats();
    
    // Highlight first character
    if (step.text.length > 0) {
        highlightKey(step.text[0].toLowerCase());
    }
}

function handleLessonTyping() {
    const typed = elements.lessonInput.value;
    const target = elements.lessonText.textContent;
    
    // Create highlighted text
    let highlightedText = '';
    let errors = 0;
    
    for (let i = 0; i < target.length; i++) {
        if (i < typed.length) {
            if (typed[i] === target[i]) {
                highlightedText += `<span class="correct">${target[i]}</span>`;
            } else {
                errors++;
                highlightedText += `<span class="incorrect">${target[i]}</span>`;
            }
        } else if (i === typed.length) {
            highlightedText += `<span class="current">${target[i]}</span>`;
        } else {
            highlightedText += target[i];
        }
    }
    
    elements.lessonText.innerHTML = highlightedText;
    
    // Update lesson stats
    updateLessonStats(typed.length, errors);
    
    // Highlight current key
    if (typed.length < target.length) {
        highlightKey(target[typed.length].toLowerCase());
    }
    
    // Check if step is complete
    if (typed === target) {
        setTimeout(() => {
            nextStep();
        }, 500);
    }
}

function updateLessonStats(characters, errors) {
    // Calculate lesson WPM
    if (lessonStartTime) {
        const timeElapsed = (Date.now() - lessonStartTime) / 1000 / 60;
        const wordsTyped = characters / 5;
        const lessonWPM = Math.round(wordsTyped / timeElapsed) || 0;
        elements.lessonWPM.textContent = lessonWPM;
    }
    
    // Calculate lesson accuracy
    const accuracy = characters > 0 ? Math.round(((characters - errors) / characters) * 100) : 100;
    elements.lessonAccuracy.textContent = accuracy + '%';
    elements.lessonErrors.textContent = errors;
}

function resetLessonStats() {
    elements.lessonWPM.textContent = '0';
    elements.lessonAccuracy.textContent = '100%';
    elements.lessonErrors.textContent = '0';
    lessonStartTime = null;
}

function startLessonTimer() {
    if (!lessonStartTime) {
        lessonStartTime = Date.now();
    }
}

function previousStep() {
    if (currentStep > 0) {
        currentStep--;
        loadLessonStep();
    }
}

function nextStep() {
    if (currentStep < lessonSteps.length - 1) {
        currentStep++;
        loadLessonStep();
    } else {
        completeLession();
    }
}

function completeLession() {
    // Unlock next lesson
    if (currentLesson === 'home-row') {
        const topRowCard = document.querySelector('[data-lesson="top-row"]');
        if (topRowCard) {
            topRowCard.classList.remove('locked');
            const btn = topRowCard.querySelector('.lesson-btn');
            btn.textContent = 'Start Lesson';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
        }
    }
    
    // Show completion message
    alert('Lesson completed! Great job!');
    showPage('lessons');
}

// Keyboard event listeners for physical keyboard
document.addEventListener('keydown', function(e) {
    const key = e.key.toLowerCase();
    highlightKey(key);
});

document.addEventListener('keyup', function(e) {
    const keyElement = document.querySelector(`[data-key="${e.key.toLowerCase()}"]`);
    if (keyElement) {
        keyElement.classList.remove('active');
    }
});

// Window controls update maximize button icon
window.addEventListener('resize', async function() {
    const isMaximized = await ipcRenderer.invoke('window-is-maximized');
    const maximizeBtn = document.getElementById('maximizeBtn');
    if (isMaximized) {
        maximizeBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 12 12">
                <rect x="2" y="2" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/>
                <rect x="4" y="4" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/>
            </svg>
        `;
    } else {
        maximizeBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 12 12">
                <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
            </svg>
        `;
    }
});