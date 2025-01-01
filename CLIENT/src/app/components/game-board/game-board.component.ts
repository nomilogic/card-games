import { Component, OnInit } from '@angular/core';
import { GameService } from '../../services/game.service';
import { Card } from '../../models/card.model';

@Component({
  selector: 'app-game-board',
  template: `
    <div class="game-board">
      <div class="opponent-hand">
        <app-player-hand [cards]="opponentCards" [isOpponent]="true"></app-player-hand>
      </div>
      
      <div class="play-area">
        <div class="deck" (click)="drawCard()" [class.disabled]="!canDraw">
          <div class="card card-back">
            <span>{{ deckSize }} cards left</span>
          </div>
        </div>
        
        <div class="played-cards">
          <app-card *ngIf="lastPlayedCard" [card]="lastPlayedCard"></app-card>
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
        <button (click)="endTurn()" *ngIf="gameStarted && isPlayerTurn">End Turn</button>
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
  `]
})
export class GameBoardComponent implements OnInit {
  playerCards: Card[] = [];
  opponentCards: Card[] = [];
  lastPlayedCard?: Card;
  gameStarted = false;
  isPlayerTurn = false;
  deckSize = 52;
  canDraw = false;

  constructor(private gameService: GameService) {}

  ngOnInit() {
    this.gameService.gameState$.subscribe(state => {
      this.playerCards = state.playerHand;
      this.opponentCards = state.opponentHand;
      this.lastPlayedCard = state.lastPlayedCard;
      this.gameStarted = state.gameStarted;
      this.isPlayerTurn = state.isPlayerTurn;
      this.deckSize = state.deckSize;
      this.canDraw = state.canDraw;
    });
  }

  startGame() {
    this.gameService.startGame();
  }

  drawCard() {
    if (this.canDraw) {
      this.gameService.drawCard();
    }
  }

  playCard(card: Card) {
    if (this.isPlayerTurn) {
      this.gameService.playCard(card);
    }
  }

  endTurn() {
    if (this.isPlayerTurn) {
      this.gameService.endTurn();
    }
  }
}
