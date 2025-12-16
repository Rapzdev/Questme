// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJW_BwyZzxqumyDsyACddWZMUKJv1O9as",
    authDomain: "ak-playvideo.firebaseapp.com",
    projectId: "ak-playvideo",
    storageBucket: "ak-playvideo.firebasestorage.app",
    messagingSenderId: "452155991718",
    appId: "1:452155991718:web:5d534214ad9526fc61f667",
    measurementId: "G-9EHXX4JKK2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

let currentUser = null;

// Check Auth State
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        showMainPage();
        loadUserData();
        loadRiddles();
    } else {
        showAuthPage();
    }
});

// Show/Hide Pages
function showAuthPage() {
    document.getElementById('authPage').classList.add('active');
    document.getElementById('mainPage').classList.remove('active');
}

function showMainPage() {
    document.getElementById('authPage').classList.remove('active');
    document.getElementById('mainPage').classList.add('active');
}

// Auth Functions
function showLogin() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
}

function showRegister() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('registerForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
}

async function register() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const errorMsg = document.getElementById('regError');

    if (!username || !password) {
        errorMsg.textContent = 'Sila isi semua ruang';
        return;
    }

    if (password !== confirmPassword) {
        errorMsg.textContent = 'Password tidak sama';
        return;
    }

    if (password.length < 6) {
        errorMsg.textContent = 'Password mestilah 6 karakter atau lebih';
        return;
    }

    try {
        // Create user with email format (username@riddle.com)
        const email = username + '@riddle.com';
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Save user data
        await database.ref('users/' + userCredential.user.uid).set({
            username: username,
            trophies: 0,
            createdAt: Date.now()
        });

        errorMsg.textContent = '';
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            errorMsg.textContent = 'Username sudah digunakan';
        } else {
            errorMsg.textContent = error.message;
        }
    }
}

async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('loginError');

    if (!username || !password) {
        errorMsg.textContent = 'Sila isi semua ruang';
        return;
    }

    try {
        const email = username + '@riddle.com';
        await auth.signInWithEmailAndPassword(email, password);
        errorMsg.textContent = '';
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMsg.textContent = 'Username atau password salah';
        } else {
            errorMsg.textContent = error.message;
        }
    }
}

function logout() {
    auth.signOut();
}

// Load User Data
async function loadUserData() {
    const snapshot = await database.ref('users/' + currentUser.uid).once('value');
    const userData = snapshot.val();
    
    if (userData) {
        document.getElementById('usernameDisplay').textContent = userData.username;
        updateTrophyDisplay(userData.trophies || 0);
    }
}

function updateTrophyDisplay(count) {
    const trophyCount = document.getElementById('trophyCount');
    const trophyDisplay = document.getElementById('trophyDisplay');
    
    trophyCount.textContent = count;
    
    // Remove all trophy classes
    trophyDisplay.className = 'trophy-display';
    
    // Add appropriate class based on trophy count
    if (count >= 50) {
        trophyDisplay.classList.add('trophy-diamond');
    } else if (count >= 30) {
        trophyDisplay.classList.add('trophy-platinum');
    } else if (count >= 20) {
        trophyDisplay.classList.add('trophy-gold');
    } else if (count >= 10) {
        trophyDisplay.classList.add('trophy-silver');
    } else if (count >= 1) {
        trophyDisplay.classList.add('trophy-bronze');
    }
}

// Tab Navigation
function showTab(tabName) {
    document.querySelectorAll('.main-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'riddles') {
        document.getElementById('riddlesTab').classList.add('active');
        loadRiddles();
    } else if (tabName === 'create') {
        document.getElementById('createTab').classList.add('active');
    } else if (tabName === 'history') {
        document.getElementById('historyTab').classList.add('active');
        loadHistory();
    }
}

// Create Riddle
async function createRiddle() {
    const question = document.getElementById('riddleQuestion').value.trim();
    const answer = document.getElementById('riddleAnswer').value.trim();
    const errorMsg = document.getElementById('createError');

    if (!question || !answer) {
        errorMsg.textContent = 'Sila isi soalan dan jawapan';
        return;
    }

    try {
        const userData = (await database.ref('users/' + currentUser.uid).once('value')).val();
        
        const riddleRef = database.ref('riddles').push();
        await riddleRef.set({
            question: question,
            answer: answer.toLowerCase(),
            authorId: currentUser.uid,
            authorName: userData.username,
            createdAt: Date.now(),
            winners: {},
            winnerCount: 0,
            active: true
        });

        document.getElementById('riddleQuestion').value = '';
        document.getElementById('riddleAnswer').value = '';
        errorMsg.textContent = '';
        
        alert('Teka-teki berjaya dihantar!');
        showTab('riddles');
        document.querySelectorAll('.main-tab')[0].classList.add('active');
    } catch (error) {
        errorMsg.textContent = 'Gagal membuat teka-teki';
    }
}

// Load Riddles
function loadRiddles() {
    const riddlesList = document.getElementById('riddlesList');
    riddlesList.innerHTML = '';

    database.ref('riddles').on('value', snapshot => {
        riddlesList.innerHTML = '';
        let hasActiveRiddles = false;

        snapshot.forEach(childSnapshot => {
            const riddle = childSnapshot.val();
            const riddleId = childSnapshot.key;

            // Only show active riddles that are not created by current user
            if (riddle.active && riddle.authorId !== currentUser.uid && riddle.winnerCount < 3) {
                hasActiveRiddles = true;
                const card = createRiddleCard(riddle, riddleId);
                riddlesList.appendChild(card);
            }
        });

        document.getElementById('noRiddles').style.display = hasActiveRiddles ? 'none' : 'block';
    });
}

function createRiddleCard(riddle, riddleId) {
    const card = document.createElement('div');
    card.className = 'riddle-card';

    const hasAnswered = riddle.winners && riddle.winners[currentUser.uid];

    card.innerHTML = `
        <div class="riddle-header">
            <span class="riddle-author">👤 ${riddle.authorName}</span>
            <span class="riddle-status">🏆 ${riddle.winnerCount}/3</span>
        </div>
        <div class="riddle-question">${riddle.question}</div>
        ${!hasAnswered ? `
            <div class="answer-section">
                <input type="text" id="answer-${riddleId}" placeholder="Jawapan anda...">
                <button onclick="submitAnswer('${riddleId}')">Hantar</button>
            </div>
            <div id="result-${riddleId}"></div>
        ` : `
            <div class="correct-answer">✓ Anda sudah menjawab dengan betul!</div>
        `}
    `;

    return card;
}

async function submitAnswer(riddleId) {
    const answerInput = document.getElementById('answer-' + riddleId);
    const userAnswer = answerInput.value.trim().toLowerCase();
    const resultDiv = document.getElementById('result-' + riddleId);

    if (!userAnswer) {
        resultDiv.innerHTML = '<div class="wrong-answer">Sila masukkan jawapan</div>';
        return;
    }

    try {
        const riddleSnapshot = await database.ref('riddles/' + riddleId).once('value');
        const riddle = riddleSnapshot.val();

        if (userAnswer === riddle.answer) {
            // Correct answer
            const userData = (await database.ref('users/' + currentUser.uid).once('value')).val();
            
            // Update riddle with winner
            await database.ref('riddles/' + riddleId + '/winners/' + currentUser.uid).set({
                username: userData.username,
                answeredAt: Date.now()
            });

            const newWinnerCount = (riddle.winnerCount || 0) + 1;
            await database.ref('riddles/' + riddleId + '/winnerCount').set(newWinnerCount);

            // If 3 winners, deactivate riddle
            if (newWinnerCount >= 3) {
                await database.ref('riddles/' + riddleId + '/active').set(false);
            }

            // Give trophy to user
            const newTrophyCount = (userData.trophies || 0) + 1;
            await database.ref('users/' + currentUser.uid + '/trophies').set(newTrophyCount);
            updateTrophyDisplay(newTrophyCount);

            resultDiv.innerHTML = '<div class="correct-answer">🎉 Betul! Anda mendapat 1 piala!</div>';
            
            setTimeout(() => {
                loadRiddles();
            }, 2000);
        } else {
            resultDiv.innerHTML = '<div class="wrong-answer">❌ Salah, cuba lagi!</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="wrong-answer">Ralat berlaku</div>';
    }
}

// Load History
function loadHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    database.ref('riddles').orderByChild('authorId').equalTo(currentUser.uid).on('value', snapshot => {
        historyList.innerHTML = '';
        let hasHistory = false;

        snapshot.forEach(childSnapshot => {
            hasHistory = true;
            const riddle = childSnapshot.val();
            const card = createHistoryCard(riddle);
            historyList.appendChild(card);
        });

        document.getElementById('noHistory').style.display = hasHistory ? 'none' : 'block';
    });
}

function createHistoryCard(riddle) {
    const card = document.createElement('div');
    card.className = 'history-card';

    const winners = riddle.winners || {};
    const winnersList = Object.values(winners);

    card.innerHTML = `
        <div class="history-header">
            <span>📅 ${new Date(riddle.createdAt).toLocaleDateString('ms-MY')}</span>
            <span class="riddle-status">🏆 ${riddle.winnerCount || 0}/3</span>
        </div>
        <div class="history-question">${riddle.question}</div>
        <div class="history-answer">Jawapan: ${riddle.answer}</div>
        ${winnersList.length > 0 ? `
            <div class="winners-list">
                <h4>🏆 Pemenang:</h4>
                ${winnersList.map(winner => `
                    <div class="winner-item">
                        ${winner.username} - ${new Date(winner.answeredAt).toLocaleString('ms-MY')}
                    </div>
                `).join('')}
            </div>
        ` : '<p style="color: #999; margin-top: 10px;">Tiada pemenang lagi</p>'}
    `;

    return card;
}
