import { Component, Input, OnInit } from '@angular/core';
import { Card } from '../../models/card.model';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-animated-card',
  template: `
    <div class="card-container" [@cardAnimation]="animationState">
      <div class="card" [class.flipped]="isFlipped">
        <div class="card-face front">
          <div class="card-value start"  
               [class.red]="suit === 'Hearts' || suit === 'Diamonds'">{{ rank }}</div>
          <div class="card-symbol start" [class.red]="suit === 'Hearts' || suit === 'Diamonds'">{{ symbol }}</div>
          <div class="card-symbol center" [class.red]="suit === 'Hearts' || suit === 'Diamonds'">{{ symbol }}</div>
          <div class="card-symbol end" [class.red]="suit === 'Hearts' || suit === 'Diamonds'">{{ symbol }}</div>
          <div class="card-value end" [class.red]="suit === 'Hearts' || suit === 'Diamonds'">{{ rank }}</div>
        </div>
        <div class="card-face back">
          🂠
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-container {
      position: absolute;
      width: 100px;
      height: 140px;
      perspective: 1000px;
      z-index: 100;
    }

    .card {
      position: relative;
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;
      transition: transform 0.6s;
    }

    .card.flipped {
      transform: rotateY(180deg);
    }

    .card-face {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      padding: 5px;
      border-radius: 10px;
      transition: transform 0.2s;
      line-height: 1;
      letter-spacing: -2px;
    }

    .card-face.back {
      background: #a00;
      transform: rotateY(180deg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.3em;
      color: white;
    }

    .card-value {
      font-size: 1.5em;
      font-weight: bold;
    }

    .card-symbol {
      font-size: 1.5em;
    }

    .start {
      align-self: flex-start;
    }

    .center {
      font-size: 2.3em;
    }

    .end {
      align-self: flex-end;
      transform: rotate(180deg);
    }

    .red {
      color: #d40000;
    }
  `],
  animations: [
    trigger('cardAnimation', [
      state('bottom', style({
        bottom: '0',
        left: '50%',
        transform: 'translate(-50%, 0) rotateX(45deg)'
      })),
      state('left', style({
        top: '50%',
        left: '0',
        transform: 'translate(0, -50%) rotateY(45deg)'
      })),
      state('top', style({
        top: '0',
        left: '50%',
        transform: 'translate(-50%, 0) rotateX(-45deg)'
      })),
      state('right', style({
        top: '50%',
        right: '0',
        transform: 'translate(0, -50%) rotateY(-45deg)'
      })),
      state('center', style({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(0deg)'
      })),
      transition('* => center', [
        animate('0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)')
      ]),
      transition('center => *', [
        animate('0.3s ease-in')
      ])
    ])
  ]
})
export class AnimatedCardComponent implements OnInit {
  @Input() card!: Card;
  @Input() startPosition: 'bottom' | 'left' | 'top' | 'right' = 'bottom';
  @Input() isFlipped: boolean = false;

  animationState: string = 'bottom';
  rank: string = '';
  suit: string = '';
  symbol: string = '';

  ngOnInit() {
    if (this.card) {
      this.rank = this.card.rank;
      this.suit = this.card.suit;
      this.symbol = this.card.symbol;
      this.animationState = this.startPosition;

      // Start animation after a brief delay
      setTimeout(() => {
        this.animationState = 'center';
      }, 100);
    }
  }

  reset() {
    this.animationState = this.startPosition;
  }

  moveToCenter() {
    this.animationState = 'center';
  }
}
