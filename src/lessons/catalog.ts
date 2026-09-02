import { FamousGame } from "./types";

export const PIECE_LESSONS: {
  id: string;
  name: string;
  defaultSquare: string;
  title: string;
  body: string;
}[] = [
  {
    id: "pawn",
    name: "How the pawn moves",
    defaultSquare: "e2",
    title: "Pawn",
    body: "Pawns walk one square forward (two from their starting rank) and capture one square diagonally. They cannot move backward or jump.",
  },
  {
    id: "knight",
    name: "How the knight moves",
    defaultSquare: "d4",
    title: "Knight",
    body: "Knights move in an L: two squares in one direction, then one square to the side. They can jump over other pieces.",
  },
  {
    id: "bishop",
    name: "How the bishop moves",
    defaultSquare: "d4",
    title: "Bishop",
    body: "Bishops slide any number of squares diagonally and stay on the same color for the whole game. They cannot jump.",
  },
  {
    id: "rook",
    name: "How the rook moves",
    defaultSquare: "d4",
    title: "Rook",
    body: "Rooks slide any number of squares horizontally or vertically. They cannot jump over pieces.",
  },
  {
    id: "queen",
    name: "How the queen moves",
    defaultSquare: "d4",
    title: "Queen",
    body: "The queen combines rook and bishop: any number of squares in a straight line or diagonally. She cannot jump.",
  },
  {
    id: "king",
    name: "How the king moves",
    defaultSquare: "e1",
    title: "King",
    body: "The king moves one square in any direction. Keep him safe. If he cannot escape check, the game is over.",
  },
];

export const FAMOUS_GAMES: FamousGame[] = [
  {
    id: "scholars-mate",
    name: "Scholar's Mate",
    hook: "A four-move checkmate that attacks the weak f7 square.",
    moves: ["e2:e4", "e7:e5", "d1:h5", "b8:c6", "f1:c4", "g8:f6", "h5:f7"],
    notes: [
      { ply: 3, text: "The queen eyes f7, the weakest square in Black's camp." },
      { ply: 5, text: "Bishop and queen both aim at f7." },
      { ply: 7, text: "Qxf7 is checkmate. The king has no escape." },
    ],
  },
  {
    id: "fools-mate",
    name: "Fool's Mate",
    hook: "The fastest mate in chess: two weak pawn moves open the king.",
    moves: ["f2:f3", "e7:e5", "g2:g4", "d8:h4"],
    notes: [
      { ply: 4, text: "Queen to h4 checkmates because f2 and g2 can no longer shield the king." },
    ],
  },
  {
    id: "italian-game",
    name: "Italian Game",
    year: 1600,
    hook: "A classical opening: fight for the center, then develop the bishop to c4.",
    moves: ["e2:e4", "e7:e5", "g1:f3", "b8:c6", "f1:c4"],
    notes: [
      { ply: 5, text: "White's bishop eyes f7. This starting position is the Italian Game." },
    ],
  },
  {
    id: "opera-game",
    name: "The Opera Game",
    year: 1858,
    hook: "Morphy's famous attacking masterpiece, played at the Paris Opera.",
    moves: [
      "e2:e4",
      "e7:e5",
      "g1:f3",
      "d7:d6",
      "d2:d4",
      "c8:g4",
      "d4:e5",
      "g4:f3",
      "d1:f3",
      "d6:e5",
      "f1:c4",
      "g8:f6",
      "f3:b3",
      "d8:e7",
      "b1:c3",
      "c7:c6",
      "c1:g5",
      "b7:b5",
      "c3:b5",
      "c6:b5",
      "c4:b5",
      "b8:d7",
      "e1:a1",
      "a8:d8",
      "d1:d7",
      "d8:d7",
      "h1:d1",
      "e7:e6",
      "b5:d7",
      "f6:d7",
      "b3:b8",
      "d7:b8",
      "d1:d8",
    ],
    notes: [
      { ply: 23, text: "Morphy castles queenside, bringing a rook to the d-file." },
      { ply: 31, text: "Queen sacrifice on b8. The last defender is deflected." },
      { ply: 33, text: "Rd8 is checkmate. The back rank is sealed." },
    ],
  },
];

export function getFamousGame(id: string): FamousGame | undefined {
  const needle = id.toLowerCase().trim();
  return FAMOUS_GAMES.find(
    (game) =>
      game.id === needle ||
      game.name.toLowerCase() === needle ||
      game.name.toLowerCase().indexOf(needle) !== -1
  );
}

export function getPieceLesson(id: string) {
  const needle = id.toLowerCase().trim();
  return PIECE_LESSONS.find((lesson) => lesson.id === needle);
}
