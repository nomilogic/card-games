import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Client, Room } from 'colyseus.js';
import { Card } from '../models/card.model';

interface GameState {
  playerHand: Card[];
  opponentHand: Card[];
  lastPlayedCard?: Card;
  gameStarted: boolean;
  isPlayerTurn: boolean;
  deckSize: number;
  canDraw: boolean;
  trumpSuit?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private client: Client;
  private room?: Room;
  private gameStateSubject = new BehaviorSubject<GameState>({
    playerHand: [],
    opponentHand: [],
    gameStarted: false,
    isPlayerTurn: false,
    deckSize: 52,
    canDraw: false
  });

  gameState$ = this.gameStateSubject.asObservable();

  constructor() {
    this.client = new Client('ws://localhost:2567');
  }

  async startGame() {
    try {
      this.room = await this.client.joinOrCreate('game_room');
      
      // Listen to state changes
      this.room.onStateChange((state) => {
        const gameState = this.mapStateToGameState(state);
        this.gameStateSubject.next(gameState);
      });
    } catch (error) {
      console.error('Could not join room:', error);
    }
  }

  playCard(card: Card) {
    if (this.room) {
      this.room.send('playCard', card);
    }
  }

  drawCard() {
    if (this.room) {
      this.room.send('drawCard');
    }
  }

  endTurn() {
    if (this.room) {
      this.room.send('endTurn');
    }
  }

  claimTricks(tricks: number) {
    if (this.room) {
      this.room.send('claimTricks', { tricks });
    }
  }

  private mapStateToGameState(serverState: any): GameState {
    // Map server state to client game state
    const playerId = this.room?.sessionId;
    const player = serverState.players.get(playerId);
    
    return {
      playerHand: player?.hand || [],
      opponentHand: [], // We don't show opponent's cards
      gameStarted: serverState.gamePhase !== 'waiting',
      isPlayerTurn: serverState.currentTurn === playerId,
      deckSize: 52 - (serverState.revealedCards?.length || 0),
      canDraw: false,
      trumpSuit: serverState.trumpSuit
    };
  }
}
