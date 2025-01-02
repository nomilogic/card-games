import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Card } from '../../models/card.model';

@Component({
  selector: 'app-card',
  template: `
    <div 
      class="card" 
      [class.face-down]="faceDown"
      [class.selectable]="selectable"
      (click)="onCardClick()">
      <ng-container *ngIf="!faceDown">
        <div class="card-value" style="align-self: flex-start; margin-left: 5px;" [style.margin-left]="card.rank === '10' ? '5px' : '10px'" [style.margin-right]="card.suit === 'Spades' ? '10px' : '0'" [class.red]="card.suit === 'Hearts' || card.suit === 'Diamonds'">{{ card.rank }}</div>
        <div class="card-value" style="align-self: flex-start; margin-left: 10px;" [class.red]="card.suit === 'Hearts' || card.suit === 'Diamonds'">{{ card.symbol }}</div>
        <div class="card-suit" [class.red]="card.suit === 'Hearts' || card.suit === 'Diamonds'">{{ card.symbol }}</div>
        <div class="card-value" style="align-self: flex-end; margin-right: 5px; rotate: 180deg;" [class.red]="card.suit === 'Hearts' || card.suit === 'Diamonds'">{{ card.symbol }}</div>
        <div class="card-value" style="align-self: flex-end; margin-right: 5px; rotate: 180deg;" [class.red]="card.suit === 'Hearts' || card.suit === 'Diamonds'">{{ card.rank }}</div>

      </ng-container>
    </div>
  `,
  styles: [`
    .card {
    
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      position: relative;
      transition: transform 0.2s;
      line-height: 1;
      letter-spacing: 1px;
    }
    
    .card.selectable:hover {
      transform: translateY(-10px) rotate(180deg);
      cursor: pointer;
    }
    
    .card.face-down {
      background: linear-gradient(45deg, #1a237e, #3949ab);
    }
    
    .card-value {
      font-size: 24px;
      font-weight: bold;
    }
    
    .card-suit {
      font-size: 36px;
    }
    
    .red {
      color: #d32f2f;
    }
  `]
})
export class CardComponent {
  @Input() card!: Card;
  @Input() faceDown = false;
  @Input() selectable = false;
  @Output() selected = new EventEmitter<void>();

  onCardClick() {
    if (this.selectable) {
      this.selected.emit();
    }
  }
}
