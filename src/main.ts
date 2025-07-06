import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ChessBoardComponent } from './components/chess-board.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChessBoardComponent],
  template: `
    <div class="app-container">
      <app-chess-board></app-chess-board>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px 0;
    }

    @media (max-width: 768px) {
      .app-container {
        padding: 10px 0;
      }
    }
  `]
})
export class App {
  name = 'Chess Game';
}

bootstrapApplication(App);