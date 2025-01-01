import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="game-container">
      <h1>Card Game</h1>
      <app-game-board></app-game-board>
    </div>
  `,
  styles: [`
    .game-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
    }
    h1 {
      color: #333;
      margin-bottom: 30px;
    }
  `]
})
export class AppComponent {
  title = 'card-game';
}
