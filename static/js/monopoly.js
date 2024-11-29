const devicePixelRatio = window.devicePixelRatio || 1;
let canvasSize;

let players = [];
let playerColors = [];
let gameState = null;
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 800;
document.body.appendChild(canvas);

document.querySelector('#game-container').style.cssText = `
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    padding: 20px;
    position: relative;
`;

document.querySelector('#game-canvas').style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
`;

function initCanvas() {
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    canvasSize = Math.min(containerWidth, containerHeight) * 0.95;
    canvas.width = canvasSize * devicePixelRatio;
    canvas.height = canvasSize * devicePixelRatio;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

window.addEventListener('resize', () => {
    if (gameState) {
        initCanvas();
        renderBoard(gameState);
    }
});

function setupCanvas() {
    const containerWidth = document.getElementById('game-container').clientWidth;
    const containerHeight = document.getElementById('game-container').clientHeight;
    const size = Math.min(containerWidth, containerHeight) * 0.9;
    canvas.width = size * devicePixelRatio;
    canvas.height = size * devicePixelRatio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    return size;
}

function addPlayer() {
    const playerNameInput = document.getElementById('player-name');
    const playerColorSelect = document.getElementById('player-color');
    const playerName = playerNameInput.value.trim();
    const playerColor = playerColorSelect.value;
    const playersList = document.getElementById('players-list');

    if (playerName && players.length < 5) {
        if (playerColors.includes(playerColor)) {
            alert('Ten kolor jest już zajęty. Wybierz inny.');
            return;
        }
        players.push(playerName);
        playerColors.push(playerColor);
        const playerDiv = document.createElement('div');
        playerDiv.innerHTML = `
            ${playerName} 
            <span style="display:inline-block; width:15px; height:15px; background-color:${playerColor}; margin-left:10px;"></span>
        `;
        playersList.appendChild(playerDiv);
        playerNameInput.value = '';
        playerColorSelect.querySelector(`option[value="${playerColor}"]`).disabled = true;
    }
}

function updatePlayerInfo(playerIndex) {
    const playerInfo = gameState.players[playerIndex];
    const playerInfoDiv = document.getElementById('player-info');
    
    document.getElementById('current-player-name').textContent = playerInfo.name;
    document.getElementById('current-player-name').innerHTML = `
        ${playerInfo.name} 
        <span style="display:inline-block; width:15px; height:15px; background-color:${playerInfo.color}; margin-left:10px;"></span>
    `;
    document.getElementById('current-player-balance').textContent = playerInfo.balance;
    document.getElementById('current-player-position').textContent = gameState.board[playerInfo.position].name;
    
    const totalHouses = gameState.board.reduce((total, property) => {
        const ownerProperty = gameState.board_ownership[property.name];
        if (ownerProperty === playerInfo.name) {
            const originalProperty = gameState.board.find(prop => prop.name === property.name);
            return total + (originalProperty ? originalProperty.houses || 0 : 0);
        }
        return total;
    }, 0);
    
    document.getElementById('current-player-houses').textContent = totalHouses;
    
    const propertiesList = document.getElementById('current-player-properties');
    propertiesList.innerHTML = '';
    playerInfo.properties.forEach(prop => {
        const li = document.createElement('li');
        const propertyInfo = gameState.board.find(p => p.name === prop);
        const houses = propertyInfo.houses || 0;
        li.textContent = `${prop} (Domki: ${houses})`;
        propertiesList.appendChild(li);
    });

    playerInfoDiv.style.display = 'block';
}

function saveGame() {
    fetch('/save_game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Gra została zapisana!');
        } else {
            alert('Błąd podczas zapisywania gry: ' + data.error);
        }
    })
    .catch(error => {
        alert('Wystąpił błąd podczas zapisywania gry');
        console.error('Błąd:', error);
    });
}

function showLoadGameDialog() {
    fetch('/get_saved_games')
    .then(response => response.json())
    .then(savedGames => {
        if (savedGames.length === 0) {
            alert('Brak zapisanych gier!');
            return;
        }

        const dialog = document.createElement('div');
        dialog.className = 'load-game-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Wybierz zapisaną grę</h3>
                <div class="saved-games-list">
                    ${savedGames.map(save => `
                        <div class="saved-game-item" onclick="loadGame('${save.filename}')">
                            <div class="save-info">
                                <div class="save-date">${save.date}</div>
                                <div class="save-name">${save.filename}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="close-button" onclick="this.parentElement.parentElement.remove()">Zamknij</button>
            </div>
        `;
        document.body.appendChild(dialog);
    })
    .catch(error => {
        alert('Błąd podczas pobierania zapisanych gier');
        console.error('Błąd:', error);
    });
}

function loadGame(filename) {
    fetch('/load_game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            gameState = data.game_state;
            hideMainMenu();
            initCanvas();
            renderBoard(gameState);
            updatePlayerInfo(gameState.current_player_index);
            updatePlayerActions(gameState.board[gameState.players[gameState.current_player_index].position]);
            document.querySelector('.load-game-dialog')?.remove();
        } else {
            alert('Błąd podczas wczytywania gry: ' + data.error);
        }
    })
    .catch(error => {
        alert('Wystąpił błąd podczas wczytywania gry');
        console.error('Błąd:', error);
    });
}

function hideMainMenu() {
    document.getElementById('game-setup').style.display = 'none';
    document.querySelector('.main-menu').style.display = 'none';
}

function startGame() {
    fetch('/start_game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            players: players,
            player_colors: playerColors
        })
    })
    .then(response => response.json())
    .then(data => {
        gameState = data;
        hideMainMenu();
        initCanvas();
        renderBoard(gameState);
        updatePlayerInfo(0);
        updatePlayerActions(gameState.board[0]);
    });
}

function renderBoard(gameState) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const boardSize = 6;
    const squareSize = canvasSize / boardSize;
    const borderWidth = 2;
    const headerHeight = squareSize * 0.2;

    function drawSquare(x, y, property) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = borderWidth;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, squareSize, squareSize);
        
        ctx.strokeRect(x, y, squareSize, squareSize);
        
        ctx.fillStyle = property.color;
        ctx.fillRect(x, y, squareSize, headerHeight);
        
        ctx.fillStyle = '#000';
        ctx.font = `bold ${squareSize * 0.1}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(
            property.name, 
            x + squareSize/2, 
            y + headerHeight + squareSize * 0.15,
            squareSize - 10
        );

        if (gameState.board_ownership[property.name]) {
            const owner = gameState.players.find(p => p.name === gameState.board_ownership[property.name]);
            if (owner) {
                ctx.strokeStyle = owner.color;
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, squareSize, squareSize);
            }
        }

        if (property.name !== 'Start' && property.price > 0) {
            ctx.fillStyle = '#000';
            ctx.font = `${squareSize * 0.08}px Arial`;
            ctx.fillText(
                `${property.price} PLN`,
                x + squareSize/2,
                y + squareSize - squareSize * 0.1
            );
        }
    }

    function getSquarePosition(index) {
        const boardSize = 6;
        if (index < boardSize) {
            return { x: index * squareSize, y: 0 };
        } else if (index < boardSize * 2 - 1) {
            return { x: (boardSize - 1) * squareSize, y: (index - boardSize + 1) * squareSize };
        } else if (index < boardSize * 3 - 2) {
            return { x: (boardSize - 1 - (index - (boardSize * 2 - 2))) * squareSize, y: (boardSize - 1) * squareSize };
        } else {
            return { x: 0, y: (boardSize - 1 - (index - (boardSize * 3 - 2))) * squareSize };
        }
    }

    gameState.board.forEach((property, index) => {
        const pos = getSquarePosition(index);
        drawSquare(pos.x, pos.y, property);
    });

    gameState.players.forEach((player, playerIndex) => {
        const pos = getSquarePosition(player.position);
        const offsetX = (playerIndex % 2) * 20 - 10;
        const offsetY = Math.floor(playerIndex / 2) * 20 - 10;
        
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(
            pos.x + squareSize/2 + offsetX,
            pos.y + squareSize/2 + offsetY,
            squareSize * 0.1,
            0,
            2 * Math.PI
        );
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = `${squareSize * 0.08}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(
            (playerIndex + 1).toString(),
            pos.x + squareSize/2 + offsetX,
            pos.y + squareSize/2 + offsetY + squareSize * 0.03
        );
    });
}

function exitToMenu() {
    if (confirm('Czy na pewno chcesz wyjść do menu głównego? Niezapisany postęp zostanie utracony.')) {
        gameState = null;
        players = [];
        playerColors = [];
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const colorSelect = document.getElementById('player-color');
        if (colorSelect) {
            Array.from(colorSelect.options).forEach(option => {
                option.disabled = false;
            });
        }
        
        const gameSetup = document.getElementById('game-setup');
        if (gameSetup) {
            gameSetup.style.display = 'block';
            updateMainMenu();
        }
        
        const playerInfo = document.getElementById('player-info');
        if (playerInfo) {
            playerInfo.style.display = 'none';
        }
    }
}

function updatePlayerActions(currentProperty) {
    const actionDiv = document.getElementById('player-actions');
    actionDiv.innerHTML = '<h3 class="section-title">Akcje</h3>';
    
    const systemButtons = document.createElement('div');
    systemButtons.className = 'system-buttons';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Zapisz grę';
    saveButton.onclick = saveGame;
    saveButton.className = 'system-button save-button';
    
    const exitButton = document.createElement('button');
    exitButton.textContent = 'Wyjdź do menu';
    exitButton.onclick = exitToMenu;
    exitButton.className = 'system-button exit-button';
    
    systemButtons.appendChild(saveButton);
    systemButtons.appendChild(exitButton);
    actionDiv.appendChild(systemButtons);
    
    const separator = document.createElement('hr');
    separator.style.margin = '15px 0';
    actionDiv.appendChild(separator);
    
    const rollDiceBtn = document.createElement('button');
    rollDiceBtn.id = 'roll-dice';
    rollDiceBtn.textContent = 'Rzuć kostką';
    actionDiv.appendChild(rollDiceBtn);

    const playerInfo = gameState.players[gameState.current_player_index];
    
    if (currentProperty.name !== 'Start' && 
        !gameState.board_ownership[currentProperty.name] && 
        playerInfo.balance >= currentProperty.price) {
        const buyPropertyBtn = document.createElement('button');
        buyPropertyBtn.textContent = `Kup ${currentProperty.name} (${currentProperty.price} PLN)`;
        buyPropertyBtn.onclick = buyProperty;
        actionDiv.appendChild(buyPropertyBtn);
    }


    if (gameState.board_ownership[currentProperty.name] === playerInfo.name &&
        playerInfo.balance >= currentProperty.house_price) {
            const buyHouseBtn = document.createElement('button');
            buyHouseBtn.textContent = `Kup domek (${currentProperty.house_price} PLN)`;
            buyHouseBtn.onclick = buyHouse;
            actionDiv.appendChild(buyHouseBtn);
        }
    
        document.getElementById('roll-dice').addEventListener('click', () => {
            fetch('/roll_dice', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                gameState = data.game_state;
                renderBoard(gameState);
                updatePlayerInfo(gameState.current_player_index);
                updatePlayerActions(gameState.board[gameState.players[gameState.current_player_index].position]);
            });
        });
    }
    
    const systemButtonsStyle = document.createElement('style');
    systemButtonsStyle.textContent = `
        .system-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .system-button {
            flex: 1;
            padding: 8px;
        }
        
        .save-button {
            background-color: #4CAF50;
        }
        
        .exit-button {
            background-color: #f44336;
        }
        
        .system-button:hover {
            opacity: 0.9;
        }
    `;
    document.head.appendChild(systemButtonsStyle);
    
    const saveLoadStyles = document.createElement('style');
    saveLoadStyles.textContent = `
        .save-load-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .save-load-buttons button {
            flex: 1;
            padding: 8px;
            background-color: #4CAF50;
        }
        
        .save-load-buttons .load-button {
            background-color: #2196F3;
        }
        
        .save-load-buttons button:hover {
            opacity: 0.9;
        }
    `;
    document.head.appendChild(saveLoadStyles);
    
    function buyProperty() {
        fetch('/buy_property', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            gameState = data.game_state;
            updatePlayerInfo(gameState.current_player_index);
            updatePlayerActions(gameState.board[gameState.players[gameState.current_player_index].position]);
        });
    }
    
    function buyHouse() {
        fetch('/buy_house', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            gameState = data.game_state;
            updatePlayerInfo(gameState.current_player_index);
            updatePlayerActions(gameState.board[gameState.players[gameState.current_player_index].position]);
        });
    }
    
    document.getElementById('roll-dice').addEventListener('click', () => {
        fetch('/roll_dice', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            gameState = data.game_state;
            renderBoard(gameState);
            updatePlayerInfo(gameState.current_player_index);
            updatePlayerActions(gameState.board[gameState.players[gameState.current_player_index].position]);
        })
        .catch(error => {
            console.error('Błąd podczas rzutu kostką:', error);
            document.getElementById('roll-dice').style.display = 'block';
        });
    });
    
    function updateMainMenu() {
        const gameSetup = document.getElementById('game-setup');
        gameSetup.innerHTML = `
            <h2 class="section-title">Monopoly</h2>
            <div class="main-menu">
                <div class="menu-options">
                    <button onclick="showNewGameSetup()" class="menu-button">Nowa gra</button>
                    <button onclick="showLoadGameDialog()" class="menu-button">Wczytaj grę</button>
                </div>
            </div>
            
            <div id="new-game-setup" style="display: none;">
                <h3 class="section-title">Ustawienia nowej gry</h3>
                <div class="setup-input">
                    <input type="text" id="player-name" placeholder="Imię gracza">
                    <select id="player-color">
                        <option value="#ff0000">Czerwony</option>
                        <option value="#0000ff">Niebieski</option>
                        <option value="#00ff00">Zielony</option>
                        <option value="#ffa500">Pomarańczowy</option>
                        <option value="#800080">Fioletowy</option>
                    </select>
                    <button onclick="addPlayer()">Dodaj gracza</button>
                </div>
                <div id="players-list"></div>
                <button onclick="startGame()" class="start-button">Rozpocznij grę</button>
            </div>
        `;
    
        const style = document.createElement('style');
        style.textContent = `
            .main-menu {
                padding: 20px 0;
            }
            
            .menu-options {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .menu-button {
                padding: 15px;
                font-size: 1.2em;
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            
            .menu-button:hover {
                background-color: #1976D2;
            }
            
            #new-game-setup {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 2px solid #eee;
            }
            
            .start-button {
                margin-top: 20px;
                width: 100%;
                padding: 12px;
                background-color: #4CAF50;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }
    
    function showNewGameSetup() {
        document.getElementById('new-game-setup').style.display = 'block';
    }
    
    const loadDialogStyles = document.createElement('style');
    loadDialogStyles.textContent = `
        .load-game-dialog {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .dialog-content {
            background: white;
            padding: 25px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .saved-games-list {
            max-height: 400px;
            overflow-y: auto;
            margin: 15px 0;
        }
        
        .saved-game-item {
            padding: 15px;
            margin: 8px 0;
            border: 1px solid #ddd;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .saved-game-item:hover {
            background: #f5f5f5;
            transform: translateY(-2px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .save-info {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .save-date {
            font-size: 0.9em;
            color: #666;
        }
        
        .save-name {
            font-weight: bold;
        }
        
        .close-button {
            width: 100%;
            padding: 10px;
            margin-top: 15px;
            background-color: #f44336;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        
        .close-button:hover {
            background-color: #d32f2f;
        }
    `;
    document.head.appendChild(loadDialogStyles);
    
    document.addEventListener('DOMContentLoaded', updateMainMenu);