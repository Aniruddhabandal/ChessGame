import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ChessService } from '../services/chess.service';
import { GameState, Position, PIECE_SYMBOLS, ChessPiece, ChessMove } from '../models/chess.models';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chess-container" *ngIf="gameState$ | async as gameState">
      <div class="game-header">
        <h1>Chess Game</h1>
        <div class="game-info">
          <div class="turn-indicator" [class.white]="gameState.currentPlayer === 'white'" 
               [class.black]="gameState.currentPlayer === 'black'">
            {{ gameState.currentPlayer === 'white' ? 'White' : 'Black' }}'s Turn
          </div>
          <div class="game-status" *ngIf="gameState.isCheck || gameState.isCheckmate">
            <span *ngIf="gameState.isCheckmate" class="checkmate">
              Checkmate! {{ gameState.winner === 'white' ? 'White' : 'Black' }} Wins!
            </span>
            <span *ngIf="gameState.isCheck && !gameState.isCheckmate" class="check">
              Check!
            </span>
          </div>
        </div>
        <div class="game-controls">
          <button (click)="startGame()" [disabled]="gameState.gameStarted && !gameState.gameEnded">
            {{ gameState.gameStarted ? 'Game Started' : 'Start Game' }}
          </button>
          <button (click)="resetGame()">Reset Game</button>
        </div>
      </div>
      
      <div class="chess-board-container">
        <div class="chess-board">
          <div class="board-row" *ngFor="let row of gameState.board; let rowIndex = index">
            <div class="board-square" 
                 *ngFor="let piece of row; let colIndex = index"
                 [class.light]="(rowIndex + colIndex) % 2 === 0"
                 [class.dark]="(rowIndex + colIndex) % 2 === 1"
                 [class.selected]="isSelected(rowIndex, colIndex, gameState)"
                 [class.valid-move]="isValidMove(rowIndex, colIndex, gameState)"
                 [class.last-move]="isLastMove(rowIndex, colIndex, gameState)"
                 (click)="selectSquare(rowIndex, colIndex)">
              <div class="piece" *ngIf="piece">
                {{ getPieceSymbol(piece) }}
              </div>
              <div class="move-indicator" *ngIf="isValidMove(rowIndex, colIndex, gameState)"></div>
            </div>
          </div>
        </div>
        
        <div class="board-coordinates">
          <div class="files">
            <div class="file" *ngFor="let file of files">{{ file }}</div>
          </div>
          <div class="ranks">
            <div class="rank" *ngFor="let rank of ranks">{{ rank }}</div>
          </div>
        </div>
      </div>
      
      <div class="move-history" *ngIf="gameState.moves.length > 0">
        <h3>Move History</h3>
        <div class="moves">
          <div class="move" *ngFor="let move of gameState.moves; let i = index">
            {{ i + 1 }}. {{ formatMove(move) }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chess-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .game-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .game-header h1 {
      font-size: 2.5rem;
      color: #2c3e50;
      margin-bottom: 20px;
      font-weight: 600;
    }

    .game-info {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-bottom: 20px;
    }

    .turn-indicator {
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1.1rem;
      transition: all 0.3s ease;
    }

    .turn-indicator.white {
      background-color: #f8f9fa;
      color: #2c3e50;
      border: 2px solid #3498db;
    }

    .turn-indicator.black {
      background-color: #2c3e50;
      color: #ffffff;
      border: 2px solid #e74c3c;
    }

    .game-status {
      font-weight: 600;
      font-size: 1.2rem;
    }

    .check {
      color: #f39c12;
    }

    .checkmate {
      color: #e74c3c;
    }

    .game-controls {
      display: flex;
      gap: 15px;
      justify-content: center;
    }

    .game-controls button {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .game-controls button:first-child {
      background-color: #27ae60;
      color: white;
    }

    .game-controls button:last-child {
      background-color: #e74c3c;
      color: white;
    }

    .game-controls button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .game-controls button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .chess-board-container {
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }

    .chess-board {
      display: grid;
      grid-template-rows: repeat(8, 60px);
      border: 3px solid #8b4513;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }

    .board-row {
      display: grid;
      grid-template-columns: repeat(8, 60px);
    }

    .board-square {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }

    .board-square.light {
      background-color: #f0d9b5;
    }

    .board-square.dark {
      background-color: #b58863;
    }

    .board-square:hover {
      opacity: 0.8;
      transform: scale(1.02);
    }

    .board-square.selected {
      background-color: #7dd87d !important;
      box-shadow: inset 0 0 0 3px #27ae60;
    }

    .board-square.valid-move {
      background-color: rgba(52, 152, 219, 0.3) !important;
    }

    .board-square.last-move {
      background-color: rgba(241, 196, 15, 0.4) !important;
    }

    .piece {
      font-size: 2.5rem;
      line-height: 1;
      user-select: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    }

    .piece:hover {
      transform: scale(1.1);
    }

    .move-indicator {
      position: absolute;
      width: 20px;
      height: 20px;
      background-color: rgba(52, 152, 219, 0.7);
      border-radius: 50%;
      pointer-events: none;
    }

    .board-coordinates {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }

    .files, .ranks {
      position: absolute;
      display: flex;
      font-size: 0.8rem;
      font-weight: 600;
      color: #8b4513;
    }

    .files {
      bottom: -20px;
      left: 3px;
      right: 3px;
    }

    .ranks {
      top: 3px;
      left: -20px;
      bottom: 3px;
      flex-direction: column;
    }

    .file, .rank {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .move-history {
      margin-top: 30px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .move-history h3 {
      margin-top: 0;
      color: #2c3e50;
    }

    .moves {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      max-height: 200px;
      overflow-y: auto;
    }

    .move {
      padding: 8px 12px;
      background-color: white;
      border-radius: 4px;
      border: 1px solid #dee2e6;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .chess-container {
        padding: 10px;
      }

      .game-header h1 {
        font-size: 2rem;
      }

      .game-info {
        flex-direction: column;
        gap: 10px;
      }

      .chess-board {
        grid-template-rows: repeat(8, 45px);
      }

      .board-row {
        grid-template-columns: repeat(8, 45px);
      }

      .board-square {
        width: 45px;
        height: 45px;
      }

      .piece {
        font-size: 2rem;
      }

      .move-indicator {
        width: 15px;
        height: 15px;
      }
    }
  `]
})
export class ChessBoardComponent implements OnInit {
  gameState$: Observable<GameState>;
  files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  constructor(private chessService: ChessService) {
    this.gameState$ = this.chessService.gameState$;
  }

  ngOnInit(): void {
    // Component initialization
  }

  selectSquare(row: number, col: number): void {
    this.chessService.selectSquare({ row, col });
  }

  startGame(): void {
    this.chessService.startGame();
  }

  resetGame(): void {
    this.chessService.resetGame();
  }

  getPieceSymbol(piece: ChessPiece): string {
    return PIECE_SYMBOLS[piece.color][piece.type];
  }

  isSelected(row: number, col: number, gameState: GameState): boolean {
    return gameState.selectedPosition?.row === row && gameState.selectedPosition?.col === col;
  }

  isValidMove(row: number, col: number, gameState: GameState): boolean {
    return gameState.validMoves.some(move => move.row === row && move.col === col);
  }

  isLastMove(row: number, col: number, gameState: GameState): boolean {
    if (gameState.moves.length === 0) return false;
    const lastMove = gameState.moves[gameState.moves.length - 1];
    return (lastMove.from.row === row && lastMove.from.col === col) || 
           (lastMove.to.row === row && lastMove.to.col === col);
  }

  formatMove(move: ChessMove): string {
    const fromSquare = this.files[move.from.col] + (8 - move.from.row);
    const toSquare = this.files[move.to.col] + (8 - move.to.row);
    const pieceSymbol = PIECE_SYMBOLS[move.piece.color][move.piece.type];
    return `${pieceSymbol} ${fromSquare} → ${toSquare}`;
  }
}