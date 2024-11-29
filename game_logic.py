import pickle
import os
import random
import json
from datetime import datetime

class Property:
    def __init__(self, name, price, house_price, color):
        self.name = name
        self.price = price
        self.house_price = house_price
        self.color = color
        self.owner = None
        self.houses = 0

    def buy(self, player):
        if self.name == "Start":
            return False 
        if self.owner is None and player.balance >= self.price:
            player.balance -= self.price
            self.owner = player
            player.properties.append(self)
            return True
        return False

    def buy_house(self, player):
        if self.owner == player and player.balance >= self.house_price:
            player.balance -= self.house_price
            self.houses += 1
            return True
        return False

class Player:
    def __init__(self, name, color):
        self.name = name
        self.balance = 1500
        self.position = 0
        self.properties = []
        self.roll_count = 0
        self.color = color

    def move(self, roll, board_size):
        self.position = (self.position + roll) % board_size
        self.roll_count += 1
        return self.position

class MonopolyGame:
    def __init__(self, player_names, player_colors):
        self.board = [
            Property("Start", 0, 0, "#00FF00"),
            Property("Brzeźno", 60, 50, "#0000FF"),
            Property("Bielany", 60, 50, "#0000FF"),
            Property("Las", 100, 50, "#FF0000"),
            Property("Śluz", 100, 50, "#FF0000"),
            Property("Wschodnia", 120, 50, "#800080"),
            Property("Główna", 140, 50, "#800080"),
            Property("Wola", 140, 50, "#800080"),
            Property("Jana Pawła II", 160, 50, "#FFA500"),
            Property("Przebudzenie", 180, 50, "#FFA500"),
            Property("Przebudzenie II", 180, 50, "#FFA500"),
            Property("Pokój", 180, 50, "#FFA500"),
            Property("Kościuszki", 200, 50, "#008000"),
            Property("Zgoda", 220, 50, "#008000"),
            Property("Warszawska", 220, 50, "#008000"),
            Property("Urok", 240, 50, "#FFFF00"),
            Property("Wilanów", 260, 50, "#FFFF00"),
            Property("Zamkowa", 260, 50, "#FFFF00"),
            Property("Złote Piaski", 280, 50, "#A52A2A"),
            Property("Niezależna", 300, 50, "#A52A2A"),
            Property("Na Zdanie", 300, 50, "#A52A2A")
        ]
        self.players = [Player(name, color) for name, color in zip(player_names, player_colors)]
        self.current_player_index = 0

    def roll_dice(self):
        return random.randint(1, 6)
    
    def save_game(self, filename=None):
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"monopoly_save_{timestamp}.pkl"
        
        save_path = os.path.join('saves', filename)
        os.makedirs('saves', exist_ok=True)
        
        with open(save_path, 'wb') as f:
            pickle.dump(self, f)
        
        return filename

    def move_player(self):
        current_player = self.players[self.current_player_index]
        dice_roll = self.roll_dice()
        new_position = current_player.move(dice_roll, len(self.board))
        self.next_player()
        return {
            'player_name': current_player.name,
            'dice_roll': dice_roll,
            'new_position': new_position
        }

    def next_player(self):
        self.current_player_index = (self.current_player_index + 1) % len(self.players)

    def get_game_state(self):
        board_ownership = {}
        for prop in self.board:
            if prop.owner:
                board_ownership[prop.name] = prop.owner.name
            else:
                board_ownership[prop.name] = None

        return {
            'players': [
                {
                    'name': player.name, 
                    'balance': player.balance, 
                    'position': player.position,
                    'properties': [prop.name for prop in player.properties],
                    'color': player.color
                } for player in self.players
            ],
            'board': [
                {
                    'name': prop.name, 
                    'color': prop.color,
                    'price': prop.price,
                    'house_price': prop.house_price,
                    'houses': prop.houses
                } for prop in self.board
            ],
            'board_ownership': board_ownership,
            'current_player_index': self.current_player_index
        }

    @staticmethod
    def load_game(filename):
        save_path = os.path.join('saves', filename)
        
        try:
            with open(save_path, 'rb') as f:
                return pickle.load(f)
        except FileNotFoundError:
            raise Exception("Plik zapisu nie istnieje")
        except Exception as e:
            raise Exception(f"Błąd podczas wczytywania gry: {str(e)}")
    
    @staticmethod
    def get_saved_games():
        saves_dir = 'saves'
        if not os.path.exists(saves_dir):
            return []
        
        saved_games = []
        for filename in os.listdir(saves_dir):
            if filename.endswith('.pkl'):
                saved_games.append({
                    'filename': filename,
                    'date': datetime.fromtimestamp(
                        os.path.getmtime(os.path.join(saves_dir, filename))
                    ).strftime("%Y-%m-%d %H:%M:%S")
                })
        
        return sorted(saved_games, key=lambda x: x['date'], reverse=True)