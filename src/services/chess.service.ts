import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChessPiece, GameState, Position, PieceColor, PieceType, ChessMove } from '../models/chess.models';

@Injectable({
  providedIn: 'root'
})
export class ChessService {
  private gameStateSubject = new BehaviorSubject<GameState>(this.getInitialGameState());
  public gameState$: Observable<GameState> = this.gameStateSubject.asObservable();

  private getInitialGameState(): GameState {
    return {
      board: this.initializeBoard(),
      currentPlayer: 'white',
      selectedPiece: null,
      selectedPosition: null,
      validMoves: [],
      isCheck: false,
      isCheckmate: false,
      moves: [],
      gameStarted: false,
      gameEnded: false
    };
  }

  private initializeBoard(): (ChessPiece | null)[][] {
    const board: (ChessPiece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Initialize white pieces
    const whiteBackRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    whiteBackRow.forEach((type, col) => {
      board[7][col] = { type, color: 'white', hasMoved: false, position: { row: 7, col } };
    });
    
    for (let col = 0; col < 8; col++) {
      board[6][col] = { type: 'pawn', color: 'white', hasMoved: false, position: { row: 6, col } };
    }
    
    // Initialize black pieces
    const blackBackRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    blackBackRow.forEach((type, col) => {
      board[0][col] = { type, color: 'black', hasMoved: false, position: { row: 0, col } };
    });
    
    for (let col = 0; col < 8; col++) {
      board[1][col] = { type: 'pawn', color: 'black', hasMoved: false, position: { row: 1, col } };
    }
    
    return board;
  }

  startGame(): void {
    const currentState = this.gameStateSubject.value;
    this.gameStateSubject.next({
      ...currentState,
      gameStarted: true
    });
  }

  resetGame(): void {
    this.gameStateSubject.next(this.getInitialGameState());
  }

  selectSquare(position: Position): void {
    const currentState = this.gameStateSubject.value;
    
    if (currentState.gameEnded) return;
    
    const piece = currentState.board[position.row][position.col];
    
    if (currentState.selectedPiece && currentState.selectedPosition) {
      // Try to move the selected piece
      if (this.isValidMove(currentState.selectedPosition, position, currentState)) {
        this.makeMove(currentState.selectedPosition, position);
      } else {
        // Deselect if clicking on invalid square, or select new piece
        if (piece && piece.color === currentState.currentPlayer) {
          this.selectPiece(piece, position);
        } else {
          this.deselectPiece();
        }
      }
    } else {
      // Select a piece
      if (piece && piece.color === currentState.currentPlayer) {
        this.selectPiece(piece, position);
      }
    }
  }

  private selectPiece(piece: ChessPiece, position: Position): void {
    const currentState = this.gameStateSubject.value;
    const validMoves = this.getValidMoves(position, currentState);
    
    this.gameStateSubject.next({
      ...currentState,
      selectedPiece: piece,
      selectedPosition: position,
      validMoves
    });
  }

  private deselectPiece(): void {
    const currentState = this.gameStateSubject.value;
    this.gameStateSubject.next({
      ...currentState,
      selectedPiece: null,
      selectedPosition: null,
      validMoves: []
    });
  }

  private makeMove(from: Position, to: Position): void {
    const currentState = this.gameStateSubject.value;
    const newBoard = currentState.board.map(row => [...row]);
    const piece = newBoard[from.row][from.col];
    const capturedPiece = newBoard[to.row][to.col];
    
    if (!piece) return;
    
    // Move the piece
    newBoard[to.row][to.col] = { ...piece, hasMoved: true, position: to };
    newBoard[from.row][from.col] = null;
    
    // Create move record
    const move: ChessMove = {
      from,
      to,
      piece,
      capturedPiece: capturedPiece || undefined,
      timestamp: Date.now()
    };
    
    // Switch players
    const nextPlayer: PieceColor = currentState.currentPlayer === 'white' ? 'black' : 'white';
    
    // Check for check/checkmate
    const isCheck = this.isInCheck(nextPlayer, newBoard);
    const isCheckmate = isCheck && this.isCheckmate(nextPlayer, newBoard);
    
    this.gameStateSubject.next({
      ...currentState,
      board: newBoard,
      currentPlayer: nextPlayer,
      selectedPiece: null,
      selectedPosition: null,
      validMoves: [],
      isCheck,
      isCheckmate,
      moves: [...currentState.moves, move],
      gameEnded: isCheckmate,
      winner: isCheckmate ? currentState.currentPlayer : undefined
    });
  }

  private getValidMoves(position: Position, gameState: GameState, applyKingSafetyFilter: boolean = true): Position[] {
    const piece = gameState.board[position.row][position.col];
    if (!piece) return [];
    
    const moves: Position[] = [];
    
    switch (piece.type) {
      case 'pawn':
        moves.push(...this.getPawnMoves(position, piece.color, gameState.board));
        break;
      case 'rook':
        moves.push(...this.getRookMoves(position, piece.color, gameState.board));
        break;
      case 'knight':
        moves.push(...this.getKnightMoves(position, piece.color, gameState.board));
        break;
      case 'bishop':
        moves.push(...this.getBishopMoves(position, piece.color, gameState.board));
        break;
      case 'queen':
        moves.push(...this.getQueenMoves(position, piece.color, gameState.board));
        break;
      case 'king':
        moves.push(...this.getKingMoves(position, piece.color, gameState.board));
        break;
    }
    
    // Filter moves that would put own king in check only if applyKingSafetyFilter is true
    if (applyKingSafetyFilter) {
      return moves.filter(move => !this.wouldMoveExposeKing(position, move, gameState.board));
    }
    
    return moves;
  }

  private getPawnMoves(position: Position, color: PieceColor, board: (ChessPiece | null)[][]): Position[] {
    const moves: Position[] = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    // Forward move
    const oneForward = { row: position.row + direction, col: position.col };
    if (this.isInBounds(oneForward) && !board[oneForward.row][oneForward.col]) {
      moves.push(oneForward);
      
      // Two squares forward from starting position
      if (position.row === startRow) {
        const twoForward = { row: position.row + 2 * direction, col: position.col };
        if (this.isInBounds(twoForward) && !board[twoForward.row][twoForward.col]) {
          moves.push(twoForward);
        }
      }
    }
    
    // Diagonal captures
    const diagonals = [
      { row: position.row + direction, col: position.col - 1 },
      { row: position.row + direction, col: position.col + 1 }
    ];
    
    diagonals.forEach(diagonal => {
      if (this.isInBounds(diagonal)) {
        const piece = board[diagonal.row][diagonal.col];
        if (piece && piece.color !== color) {
          moves.push(diagonal);
        }
      }
    });
    
    return moves;
  }

  private getRookMoves(position: Position, color: PieceColor, board: (ChessPiece | null)[][]): Position[] {
    const moves: Position[] = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    directions.forEach(([rowDir, colDir]) => {
      for (let i = 1; i < 8; i++) {
        const newPos = { row: position.row + i * rowDir, col: position.col + i * colDir };
        if (!this.isInBounds(newPos)) break;
        
        const piece = board[newPos.row][newPos.col];
        if (!piece) {
          moves.push(newPos);
        } else {
          if (piece.color !== color) {
            moves.push(newPos);
          }
          break;
        }
      }
    });
    
    return moves;
  }

  private getKnightMoves(position: Position, color: PieceColor, board: (ChessPiece | null)[][]): Position[] {
    const moves: Position[] = [];
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    knightMoves.forEach(([rowOffset, colOffset]) => {
      const newPos = { row: position.row + rowOffset, col: position.col + colOffset };
      if (this.isInBounds(newPos)) {
        const piece = board[newPos.row][newPos.col];
        if (!piece || piece.color !== color) {
          moves.push(newPos);
        }
      }
    });
    
    return moves;
  }

  private getBishopMoves(position: Position, color: PieceColor, board: (ChessPiece | null)[][]): Position[] {
    const moves: Position[] = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    
    directions.forEach(([rowDir, colDir]) => {
      for (let i = 1; i < 8; i++) {
        const newPos = { row: position.row + i * rowDir, col: position.col + i * colDir };
        if (!this.isInBounds(newPos)) break;
        
        const piece = board[newPos.row][newPos.col];
        if (!piece) {
          moves.push(newPos);
        } else {
          if (piece.color !== color) {
            moves.push(newPos);
          }
          break;
        }
      }
    });
    
    return moves;
  }

  private getQueenMoves(position: Position, color: PieceColor, board: (ChessPiece | null)[][]): Position[] {
    return [
      ...this.getRookMoves(position, color, board),
      ...this.getBishopMoves(position, color, board)
    ];
  }

  private getKingMoves(position: Position, color: PieceColor, board: (ChessPiece | null)[][]): Position[] {
    const moves: Position[] = [];
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];
    
    directions.forEach(([rowDir, colDir]) => {
      const newPos = { row: position.row + rowDir, col: position.col + colDir };
      if (this.isInBounds(newPos)) {
        const piece = board[newPos.row][newPos.col];
        if (!piece || piece.color !== color) {
          moves.push(newPos);
        }
      }
    });
    
    return moves;
  }

  private isInBounds(position: Position): boolean {
    return position.row >= 0 && position.row < 8 && position.col >= 0 && position.col < 8;
  }

  private isValidMove(from: Position, to: Position, gameState: GameState): boolean {
    return gameState.validMoves.some(move => move.row === to.row && move.col === to.col);
  }

  private isInCheck(color: PieceColor, board: (ChessPiece | null)[][]): boolean {
    const king = this.findKing(color, board);
    if (!king) return false;
    
    const opponentColor: PieceColor = color === 'white' ? 'black' : 'white';
    
    // Check if any opponent piece can attack the king
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === opponentColor) {
          const moves = this.getValidMoves({ row, col }, {
            board,
            currentPlayer: opponentColor,
            selectedPiece: null,
            selectedPosition: null,
            validMoves: [],
            isCheck: false,
            isCheckmate: false,
            moves: [],
            gameStarted: true,
            gameEnded: false
          }, false); // Set applyKingSafetyFilter to false to break recursion
          
          if (moves.some(move => move.row === king.row && move.col === king.col)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  private findKing(color: PieceColor, board: (ChessPiece | null)[][]): Position | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'king' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  private isCheckmate(color: PieceColor, board: (ChessPiece | null)[][]): boolean {
    // Find all possible moves for the player
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === color) {
          const moves = this.getValidMoves({ row, col }, {
            board,
            currentPlayer: color,
            selectedPiece: null,
            selectedPosition: null,
            validMoves: [],
            isCheck: false,
            isCheckmate: false,
            moves: [],
            gameStarted: true,
            gameEnded: false
          }); // Keep applyKingSafetyFilter as true (default) for checkmate detection
          
          // If any move doesn't result in check, it's not checkmate
          for (const move of moves) {
            if (!this.wouldMoveExposeKing({ row, col }, move, board)) {
              return false;
            }
          }
        }
      }
    }
    
    return true;
  }

  private wouldMoveExposeKing(from: Position, to: Position, board: (ChessPiece | null)[][]): boolean {
    // Simulate the move
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[from.row][from.col];
    if (!piece) return false;
    
    newBoard[to.row][to.col] = piece;
    newBoard[from.row][from.col] = null;
    
    return this.isInCheck(piece.color, newBoard);
  }
}