import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Card } from '../../models/card.model';

@Component({
  selector: 'app-player-hand',
  template: `
    <div class="player-hand">
      <app-card
        *ngFor="let card of cards"
        [card]="card"
        [faceDown]="isOpponent"
        [selectable]="!isOpponent"
        (selected)="onCardSelected(card)">
      </app-card>
    </div>
  `,
  styles: [`
    .player-hand {
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 20px;
      width: 100%;
      flex-wrap: wrap;
    }
  `]
})
export class PlayerHandComponent {
  @Input() cards: Card[] = [];
  @Input() isOpponent = false;
  @Output() cardSelected = new EventEmitter<Card>();

  onCardSelected(card: Card) {
    if (!this.isOpponent) {
      this.cardSelected.emit(card);
    }
  }
}
