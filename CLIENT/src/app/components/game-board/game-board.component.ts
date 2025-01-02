import { Component, OnInit } from '@angular/core';
import { GameService } from '../../services/game.service';
import { Card } from '../../models/card.model';

@Component({
  selector: 'app-game-board',
  template: `
    <div class="game-board">
      <div class="opponent-hand">
        <app-player-hand [cards]="opponentCards" [isOpponent]="false"></app-player-hand>
      </div>
      
      <div class="play-area">
        <!-- <div class="deck" (click)="drawCard()" [class.disabled]="!canDraw">
          <div class="card card-back">
            <span>{{ deckSize }} cards left</span>
          </div>
        </div> -->
        
        <div class="played-cards-area">
          <app-animated-card
            *ngFor="let card of playedCards; let i = index"
            [card]="card"
            [startPosition]="getStartPosition(i)"
            [isFlipped]="false">
          </app-animated-card>
        </div>
      </div>
      
      <div class="player-hand">
        <app-player-hand 
          [cards]="playerCards" 
          [isOpponent]="false"
          (cardSelected)="playCard($event)">
        </app-player-hand>
      </div>
      
      <div class="controls">
        <button (click)="startGame()" *ngIf="!gameStarted">Start Game</button>
        <!-- <button (click)="endTurn()" *ngIf="gameStarted && isPlayerTurn">End Turn</button> -->
      </div>
    </div>
  `,
  styles: [`
    .game-board {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 10px;
      min-height: 600px;
    }
    
    .play-area {
      display: flex;
      justify-content: center;
      gap: 50px;
      align-items: center;
      flex: 1;
    }
    
    .deck {
      cursor: pointer;
    }
    
    .deck.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .controls {
      display: flex;
      justify-content: center;
      gap: 10px;
    }
    
    button {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      background: #4CAF50;
      color: white;
      cursor: pointer;
      font-size: 16px;
    }
    
    button:hover {
      background: #45a049;
    }
    
    .played-cards-area {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      height: 300px;
    }
  `]
})
export class GameBoardComponent implements OnInit {
  playerCards: Card[] = [];
  opponentCards: Card[] = [];
  lastPlayedCard?: Card;
  playedCards: Card[] = [];
  gameStarted = false;
  isPlayerTurn = false;
  deckSize = 52;
  canDraw = false;

  constructor(private gameService: GameService) { }

  ngOnInit() {
    this.gameService.gameState$.subscribe(state => {
      const currentPlayer = Array.from(state.players.values()).find(p => p.isHuman);
      const opponent = Array.from(state.players.values()).find(p => !p.isHuman);

      if (currentPlayer) {
        this.playerCards = currentPlayer.hand;
      }
      if (opponent) {
        this.opponentCards = opponent.hand;
      }
      this.lastPlayedCard = state.currentTrickCards[state.currentTrickCards.length - 1];
      this.playedCards = state.currentTrickCards;
      this.gameStarted = state.gamePhase !== 'waiting';
      this.isPlayerTurn = state.currentPlayerIndex === currentPlayer?.index;
      this.deckSize = 52 - Array.from(state.players.values()).reduce((total, player) => total + player.hand.length, 0);
      this.canDraw = state.gamePhase === 'playing' && this.isPlayerTurn;
    });
  }

  getStartPosition(index: number): 'bottom' | 'left' | 'top' | 'right' {
    const positions: ('bottom' | 'left' | 'top' | 'right')[] = ['bottom', 'left', 'top', 'right'];
    return positions[index % 4];
  }

  startGame() {
    this.gameService.startGame();
  }

  /* drawCard() {
    if (this.canDraw) {
      this.gameService.drawCard();
    }
  } */

  playCard(card: Card) {
    if (this.isPlayerTurn) {
      this.playedCards = [...this.playedCards, card];
      this.gameService.playCard(card);
    }
  }

  // endTurn() {
  //   if (this.isPlayerTurn) {
  //     this.gameService.endTurn();
  //   }
  // }
}
