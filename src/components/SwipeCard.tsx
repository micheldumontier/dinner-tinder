import { useRef, useState } from "react";
import type { Recipe } from "../api/types";

interface Props {
  recipe: Recipe;
  /** Stacking depth (0 = top, draggable). */
  depth: number;
  onSwipe: (liked: boolean) => void;
}

const THRESHOLD = 110; // px of horizontal travel to commit a swipe

export function SwipeCard({ recipe, depth, onSwipe }: Props) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<null | "like" | "nope">(null);
  const [imgFailed, setImgFailed] = useState(false);
  const startX = useRef<number | null>(null);
  const isTop = depth === 0;

  function fly(liked: boolean) {
    setLeaving(liked ? "like" : "nope");
    setDx(liked ? 600 : -600);
    window.setTimeout(() => onSwipe(liked), 180);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!isTop || leaving) return;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    setDx(e.clientX - startX.current);
  }

  function onPointerUp() {
    if (startX.current === null) return;
    startX.current = null;
    if (dx > THRESHOLD) fly(true);
    else if (dx < -THRESHOLD) fly(false);
    else setDx(0);
  }

  const rotation = dx / 18;
  const decision = dx > 40 ? "like" : dx < -40 ? "nope" : null;

  // Cards deeper in the stack sit slightly smaller and lower.
  const baseStyle: React.CSSProperties = isTop
    ? {
        transform: `translateX(${dx}px) rotate(${rotation}deg)`,
        transition: startX.current === null ? "transform 0.18s ease-out" : "none",
      }
    : {
        transform: `scale(${1 - depth * 0.04}) translateY(${depth * 12}px)`,
        filter: "brightness(0.96)",
      };

  return (
    <div
      className={`swipe-card${isTop ? " top" : ""}${leaving ? " leaving" : ""}`}
      style={{ ...baseStyle, zIndex: 100 - depth }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="card-image"
        style={
          imgFailed
            ? undefined
            : { backgroundImage: `url(${recipe.thumbnail})` }
        }
      >
        {/* Hidden probe img so we know if the network image failed (offline). */}
        <img
          src={recipe.thumbnail}
          alt=""
          style={{ display: "none" }}
          onError={() => setImgFailed(true)}
        />
        {imgFailed && <span className="card-image-fallback">🍲</span>}

        {isTop && decision === "like" && <span className="stamp like">YUM</span>}
        {isTop && decision === "nope" && <span className="stamp nope">NOPE</span>}

        <div className="card-gradient" />
        <div className="card-caption">
          <h2>{recipe.name}</h2>
          <p className="card-tags">
            {recipe.area} · {recipe.category}
          </p>
        </div>
      </div>

      <div className="card-body">
        <p className="card-ingredients">{recipe.ingredients.slice(0, 5).join(" · ")}</p>
        <p className="card-instructions">{recipe.instructions}</p>
      </div>
    </div>
  );
}
