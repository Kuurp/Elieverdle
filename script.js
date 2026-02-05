const CORRECT = 'correct';
const PARTIALLY_CORRECT = 'partially_correct';
const WRONG = 'wrong';

const csvPath = 'data.csv';
const urlForResultShare = 'https://kuuro-neko.github.io/Elieverdle/';
const fieldLength = 4;
const triesToHint = 5;

var game = {
    tries: [],
    hintShown: false,
};
var playerData = JSON.parse(localStorage.getItem('elieverdle_playerData') || '{}');
var stats = JSON.parse(localStorage.getItem('elieverdle_stats') || '{}');

function getSeed() {
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Paris"}));
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

const todaysSeed = getSeed();
setInterval(() => {
    if (getSeed() !== todaysSeed) {
        location.reload();
    }
}, 10000);

function processDataAsText(text) {
    return text
        .trim()
        .split('\n')
        .slice(2)  // Skip first two rows (title and header)
        .filter(row => row.trim())
        .filter(row => {
            const fields = row.split(',');
            return fields.length === fieldLength && fields.every(field => field.trim());
        })
        .map(row => {
            const [name, species, height, pacoca] = row.split(',');
            return { name, species, height, pacoca };
        });
}

async function getData(csvPath) {
    const response = await fetch(csvPath);
    const text = await response.text();
    return processDataAsText(text);
}

let data;
let todaysCharIndex;
let suggestionHighlight = -1;

const input = document.querySelector('input');
const suggestionsDiv = document.getElementById('suggestions');
const rowsDiv = document.getElementById('rows');

getData(csvPath).then(loadedData => {
    data = loadedData;
    console.log('Data loaded:', loadedData);
    todaysCharIndex = getSeed() % data.length;
    
    const seed = getSeed();
    loadGameData(seed, playerData);
    console.log('Stats:', stats);
    displayGame();
});


input.addEventListener('input', (e) => {
    const value = e.target.value.toLowerCase();
    suggestionsDiv.innerHTML = '';
    suggestionHighlight = -1;
    
    if (value) {
        const matches = data.filter(char => {
            const words = char.name.toLowerCase().split(' ');
            return words.some(word => word.startsWith(value)) && !game.tries.includes(char.name);
        });
        
        if (matches.length === 0) {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = 'No character found';
            item.style.cursor = 'default';
            item.classList.add('no-match');
            suggestionsDiv.appendChild(item);
        } else {
            matches.forEach((char, index) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.textContent = char.name;
                item.addEventListener('click', () => {
                    play(char.name);
                });
                suggestionsDiv.appendChild(item);
            });
        }
    }
});

function updateSuggestionHighlight() {
    const suggestions = suggestionsDiv.querySelectorAll('.suggestion-item');
    suggestions.forEach((item, index) => {
        if (index === suggestionHighlight) {
            item.classList.add('highlighted');
        } else {
            item.classList.remove('highlighted');
        }
    });
}

input.addEventListener('keydown', (e) => {
    const suggestions = suggestionsDiv.querySelectorAll('.suggestion-item');
    
    if (suggestions.length === 0) {
        if (e.key === 'Enter') {
            return;
        }
    }
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (suggestions.length > 0) {
            suggestionHighlight = (suggestionHighlight + 1) % suggestions.length;
            updateSuggestionHighlight();
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (suggestions.length > 0) {
            suggestionHighlight = suggestionHighlight <= 0 ? suggestions.length - 1 : suggestionHighlight - 1;
            updateSuggestionHighlight();
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions.length > 0) {
            const indexToValidate = suggestionHighlight === -1 ? 0 : suggestionHighlight;
            const charName = suggestions[indexToValidate].textContent;
            play(charName);
        }
    }
});

function play(charName) {
    const charIndex = data.findIndex(char => char.name === charName);
    if (charIndex === -1) return;
    
    const char = data[charIndex];
    const todaysChar = data[todaysCharIndex];
    
    game.tries.push(charName);
    const seed = getSeed();
    const won = charName === todaysChar.name;
    
    // If won, immediately store in stats
    if (won) {
        const numTries = game.tries.length;
        stats[numTries] = (stats[numTries] || 0) + 1;
        localStorage.setItem('elieverdle_stats', JSON.stringify(stats));
    }
    
    playerData[seed] = { 
        tries: game.tries, 
        hintShown: game.hintShown,
        win: won,
        stored: won  // Mark as stored if won
    };
    localStorage.setItem('elieverdle_playerData', JSON.stringify(playerData));
    
    displayGame();
    
    input.value = '';
    suggestionsDiv.innerHTML = '';
    suggestionHighlight = -1;
}

function cleanupOldGames(currentSeed, playerData) {
    const seedsToRemove = [];
    let statsUpdated = false;
    
    for (const seed in playerData) {
        if (seed !== currentSeed.toString()) {
            const gameData = playerData[seed];
            
            const hasWin = gameData.win === true;
            const hasStored = gameData.stored === true;
            const isOldFormat = !('win' in gameData) && !('stored' in gameData);

            if ((hasWin && !hasStored) || isOldFormat) {
                if (hasWin || (isOldFormat && gameData.tries)) {
                    const tries = gameData.tries || [];
                    const todaysCharForOldGame = data[parseInt(seed) % data.length];
                    const won = tries.includes(todaysCharForOldGame.name);
                    
                    if (won) {
                        const numTries = tries.length;
                        stats[numTries] = (stats[numTries] || 0) + 1;
                        statsUpdated = true;
                    }
                }
            }
            
            seedsToRemove.push(seed);
        }
    }
    
    seedsToRemove.forEach(seed => delete playerData[seed]);
    
    if (seedsToRemove.length > 0) {
        localStorage.setItem('elieverdle_playerData', JSON.stringify(playerData));
    }
    
    if (statsUpdated) {
        localStorage.setItem('elieverdle_stats', JSON.stringify(stats));
    }
}

function loadGameData(seed, playerData) {
    cleanupOldGames(seed, playerData);
    
    if (playerData[seed]) {
        game.tries = playerData[seed].tries || [];
        game.hintShown = playerData[seed].hintShown || false;
    } else {
        game.tries = [];
        game.hintShown = false;
    }
}

const emojiMap = {
    'correct': '🟩',
    'partially_correct': '🟨',
    'wrong': '🟥',
};

function includes(str1, str2) {
    return str1.indexOf(str2) !== -1;
}

function compare(played, todays) {
    return played === todays ? CORRECT : WRONG;
}

function compareSpecies(played, todays) {
    const firstWord = todays.split(' ')[0];
    if (played === todays) {
        return CORRECT;
    }
    if (includes(played, firstWord) || includes(todays, played)) { // should work for ?
        return PARTIALLY_CORRECT;
    }
    return WRONG;
}

function compareClubs(played, todays) {
    if (played === todays) {
        return CORRECT;
    }
    if (includes(played, todays) || includes(todays, played)) { // should work for ?
        return PARTIALLY_CORRECT;
    }
    return WRONG;
}

function compareChar(charPlayed, todaysChar) {
    return {
        name: compare(charPlayed.name, todaysChar.name),
        species: compareSpecies(charPlayed.species, todaysChar.species),
        height: compareClubs(charPlayed.height, todaysChar.height),
        pacoca: compare(charPlayed.pacoca, todaysChar.pacoca),
    };
}

function charRecapEmoji(comparison) {
    var recap = '';
    recap += emojiMap[comparison.name];
    recap += emojiMap[comparison.species];
    recap += emojiMap[comparison.height];
    recap += emojiMap[comparison.pacoca];
    return recap;
}

function resultToClipboard() {
    const todaysChar = data[todaysCharIndex];
    let result = `Elieverdle\n`;
    game.tries.forEach(charName => {
        const charIndex = data.findIndex(char => char.name === charName);
        if (charIndex === -1) return;
        
        const char = data[charIndex];
        const comparison = compareChar(char, todaysChar);
        result += `${charRecapEmoji(comparison)}\n`;
    });
    result += `${urlForResultShare}`;
    const copiedDiv = document.getElementById('copied');
    navigator.clipboard.writeText(result).then(() => {
        copiedDiv.style.display = '';
        setTimeout(() => {
            copiedDiv.style.display = 'none';
        }, 2000);
    });
}

function getWinDivInnerHTML() {
    const todaysChar = data[todaysCharIndex];
    return `
        <h2>Victory!</h2>
        <p>You guessed ${todaysChar.name} correctly!</p>
        <div id="share">
            <button id="shareBtn" onclick="resultToClipboard()">Share Result</button>
        </div>
        <div id="copied" style="display:none;">Result copied to clipboard!</div>`;
}

function displayGame() {
    rowsDiv.innerHTML = '';
    if (game.tries.length > 0) {
        document.getElementById('header').style.display = '';
    }
    const todaysChar = data[todaysCharIndex];
    game.tries.forEach(charName => {
        const charIndex = data.findIndex(char => char.name === charName);
        if (charIndex === -1) return;
        
        const char = data[charIndex];

        const comparison = compareChar(char, todaysChar);
        
        const nameClass = comparison.name;
        const speciesClass = comparison.species;
        const heightClass = comparison.height;
        const pacocaClass = comparison.pacoca;
        
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
            <div class="name ${nameClass}">${char.name}</div>
            <div class="species ${speciesClass}">${char.species}</div>
            <div class="height ${heightClass}">${char.height}</div>
            <div class="pacoca ${pacocaClass}">${char.pacoca}</div>
        `;
        rowsDiv.appendChild(row);
    });
    
    if (isWon()) {
        input.disabled = true;
        const winDiv = document.getElementById('win');
        winDiv.style.display = '';
        winDiv.innerHTML = getWinDivInnerHTML();
    } else {
        input.disabled = false;
    }
}

function isWon() {
    const todaysChar = data[todaysCharIndex];
    console.log('Todays char:', todaysChar);
    return game.tries.includes(todaysChar.name);

}

if (new Date().getDay() === 5) { // 5 = Friday
    document.body.style.backgroundImage = "url('image.png')";
    document.body.style.backgroundSize = "cover";
}