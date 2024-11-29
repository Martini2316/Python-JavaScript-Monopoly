from flask import Flask, render_template, jsonify, request, send_from_directory
from game_logic import MonopolyGame
import os

app = Flask(__name__)

game = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start_game', methods=['POST'])
def start_game():
    global game
    player_names = request.json.get('players', [])
    player_colors = request.json.get('player_colors', [])
    game = MonopolyGame(player_names, player_colors)
    return jsonify(game.get_game_state())

@app.route('/roll_dice', methods=['POST'])
def roll_dice():
    global game
    if not game:
        return jsonify({'error': 'Game not started'}), 400
    
    move_result = game.move_player()
    game_state = game.get_game_state()
    
    return jsonify({
        'move_result': move_result,
        'game_state': game_state
    })

@app.route('/buy_property', methods=['POST'])
def buy_property():
    global game
    if not game:
        return jsonify({'error': 'Game not started'}), 400
    
    current_player = game.players[game.current_player_index]
    current_property = game.board[current_player.position]
    
    if current_property.buy(current_player):
        game_state = game.get_game_state()
        return jsonify({
            'success': True, 
            'game_state': game_state
        })
    
    return jsonify({'error': 'Nie można kupić ulicy'}), 400

@app.route('/buy_house', methods=['POST'])
def buy_house():
    global game
    if not game:
        return jsonify({'error': 'Game not started'}), 400
    
    current_player = game.players[game.current_player_index]
    current_property = game.board[current_player.position]
    
    if current_property.buy_house(current_player):
        game_state = game.get_game_state()
        return jsonify({
            'success': True, 
            'game_state': game_state
        })
    
    return jsonify({'error': 'Nie można kupić domku'}), 400

@app.route('/save_game', methods=['POST'])
def save_game():
    global game
    if not game:
        return jsonify({'error': 'Brak aktywnej gry'}), 400
    
    try:
        filename = game.save_game()
        return jsonify({
            'success': True,
            'filename': filename,
            'message': 'Gra została zapisana'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/load_game', methods=['POST'])
def load_game():
    global game
    filename = request.json.get('filename')
    
    if not filename:
        return jsonify({'error': 'Nie podano nazwy pliku'}), 400
    
    try:
        game = MonopolyGame.load_game(filename)
        return jsonify({
            'success': True,
            'game_state': game.get_game_state(),
            'message': 'Gra została wczytana'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_saved_games', methods=['GET'])
def get_saved_games():
    try:
        saved_games = MonopolyGame.get_saved_games()
        return jsonify(saved_games)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)