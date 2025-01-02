import { Injectable } from '@angular/core';
import { Client } from 'colyseus.js';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';

export interface Player {
  id: string;
  index: number;
  partnerId: string;
  isHuman: boolean;
  tricksWon: number;
  tricksClaimed: number;
  hand: Card[];
  tricksWonCards: Card[];
  playedCards: Card[];
}

export interface GameState {
  trumpSuit: string;
  players: Map<string, Player>;
  currentTrickCards: Card[];
  currentPlayerIndex: number;
  gamePhase: string;
  claimWinnerId: string;
  highestClaim: number;
  consecutivePasses: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private client: Client;
  private room: any;

  private gameStateSubject = new BehaviorSubject<GameState>({
    trumpSuit: "",
    players: new Map(),
    currentTrickCards: [],
    currentPlayerIndex: 0,
    gamePhase: "waiting",
    claimWinnerId: "",
    highestClaim: 0,
    consecutivePasses: 0
  });

  gameState$ = this.gameStateSubject.asObservable();

  constructor() {
    this.client = new Client('ws://localhost:2567');
  }

  async startGame() {
    try {
      this.room = await this.client.joinOrCreate('game_room');

      // Listen to state changes
      this.room.onStateChange((state: any) => {
        console.log('Raw server state:', state);
        const gameState = this.mapStateToGameState(state);
        console.log('Mapped game state:', gameState);
        this.gameStateSubject.next(gameState);
      });
    } catch (error) {
      console.error('Could not join room:', error);
    }
  }

  playCard(card: Card) {
    if (this.room) {
      this.room.send('playCard', {
        suit: card.suit,
        power: card.power
      });
    }
  }

  claimTricks(claim: number) {
    if (this.room) {
      this.room.send('claimTricks', { claim });
    }
  }

  selectTrump(suit: string) {
    if (this.room) {
      this.room.send('selectTrump', { suit });
    }
  }

  getCurrentPlayerId(): string {
    return this.room?.sessionId || '';
  }

  private mapStateToGameState(serverState: any): GameState {
    const players = new Map<string, Player>();

    // Convert server's MapSchema to regular Map
    serverState.players.forEach((player: any, key: string) => {
      console.log(player);
      players.set(key, {
        id: player.id,
        index: player.index,
        partnerId: player.partnerId,
        isHuman: player.isHuman,
        tricksWon: player.tricksWon,
        tricksClaimed: player.tricksClaimed,
        hand: Array.from(player.hand || []),
        tricksWonCards: Array.from(player.tricksWonCards || []),
        playedCards: Array.from(player.playedCards || [])
      });
    });

    return {
      trumpSuit: serverState.trumpSuit,
      players: players,
      currentTrickCards: Array.from(serverState.currentTrickCards || []),
      currentPlayerIndex: serverState.currentPlayerIndex,
      gamePhase: serverState.gamePhase,
      claimWinnerId: serverState.claimWinnerId,
      highestClaim: serverState.highestClaim,
      consecutivePasses: serverState.consecutivePasses
    };
  }
}
