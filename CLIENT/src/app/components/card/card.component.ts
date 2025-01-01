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
        <div class="card-value" [class.red]="card.isRed">{{ card.value }}</div>
        <div class="card-suit" [class.red]="card.isRed">{{ card.suit }}</div>
      </ng-container>
    </div>
  `,
  styles: [`
    .card {
      width: 100px;
      height: 140px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      position: relative;
      transition: transform 0.2s;
    }
    
    .card.selectable:hover {
      transform: translateY(-10px);
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
