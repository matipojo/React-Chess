import "./Tile.css";

interface Props {
  image?: string;
  pieceColor?: "white" | "black";
  number: number;
  highlight: boolean;
  highlightKind?: string;
  peek?: boolean;
}

export default function Tile({ number, image, pieceColor, highlight, highlightKind, peek }: Props) {
  const className: string = ["tile",
    number % 2 === 0 && "black-tile",
    number % 2 !== 0 && "white-tile",
    highlight && "tile-highlight",
    highlightKind && `tile-mark-${highlightKind}`,
    peek && "tile-peek",
    image && "chess-piece-tile"].filter(Boolean).join(' ');


  return (
    <div className={className}>
      {image && (
        <div
          style={{ backgroundImage: `url(${image})` }}
          className={["chess-piece", pieceColor && `chess-piece-${pieceColor}`].filter(Boolean).join(" ")}
        />
      )}
      {peek && <div className="tile-peek-overlay" />}
    </div>
  );
}