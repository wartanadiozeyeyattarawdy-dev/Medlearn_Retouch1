import { useEffect, useRef, useState } from "react";

interface GameCanvasProps {
  onGameEnd: (score: number, correct: number) => void;
  onQuestion: (index: number) => void;
  totalQuestions: number;
}

export function GameCanvas({ onGameEnd, onQuestion, totalQuestions }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"playing" | "ended">("playing");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [position, setPosition] = useState(50);
  const [obstacles, setObstacles] = useState<{ x: number; y: number; width: number; height: number }[]>([]);
  const [frame, setFrame] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Fond
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#87CEEB");
      gradient.addColorStop(1, "#E0F7FA");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Sol
      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(0, height - 40, width, 40);

      // Ligne de sol
      ctx.fillStyle = "#388E3C";
      ctx.fillRect(0, height - 42, width, 4);

      // Joueur
      const playerX = 80;
      const playerY = position;
      const playerSize = 30;

      // Ombre
      ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.shadowBlur = 10;

      // Corps du joueur (caractère stylisé)
      ctx.shadowBlur = 0;

      // Balle (corps)
      ctx.beginPath();
      ctx.arc(playerX + playerSize/2, playerY, playerSize/2, 0, Math.PI * 2);
      ctx.fillStyle = "#FF6B6B";
      ctx.fill();
      ctx.strokeStyle = "#E53935";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Yeux
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(playerX + playerSize/2 - 7, playerY - 5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(playerX + playerSize/2 + 7, playerY - 5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(playerX + playerSize/2 - 5, playerY - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(playerX + playerSize/2 + 9, playerY - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      // Sourire
      ctx.beginPath();
      ctx.arc(playerX + playerSize/2, playerY + 5, 8, 0, Math.PI);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Obstacles
      obstacles.forEach((obs) => {
        ctx.fillStyle = "#E53935";
        ctx.shadowColor = "rgba(229,57,53,0.3)";
        ctx.shadowBlur = 15;

        // Dessiner un obstacle stylisé
        const x = obs.x;
        const y = obs.y;
        const w = obs.width;
        const h = obs.height;

        // Corps de l'obstacle
        ctx.fillStyle = "#E53935";
        ctx.shadowBlur = 10;
        ctx.fillRect(x, y, w, h);

        // Détails
        ctx.fillStyle = "#C62828";
        ctx.shadowBlur = 0;
        ctx.fillRect(x + 5, y + 5, w - 10, h / 3);
        ctx.fillRect(x + 5, y + h - 5 - h/3, w - 10, h / 3);

        // Points d'exclamation
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("!", x + w/2, y + h/2 + 7);
      });

      // Score
      ctx.fillStyle = "white";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 10;
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`🏆 ${score}`, 20, 40);

      // Vies
      ctx.textAlign = "right";
      ctx.fillText(`❤️`.repeat(lives), width - 20, 40);

      // Ombre reset
      ctx.shadowBlur = 0;
    };

    const update = () => {
      if (gameState === "ended") return;

      setFrame(f => f + 1);

      // Déplacer les obstacles
      setObstacles(prev => {
        const newObs = prev.map(obs => ({
          ...obs,
          x: obs.x - 4,
        })).filter(obs => obs.x + obs.width > -20);

        // Ajouter un nouvel obstacle
        if (frame % 60 === 0 && newObs.length < 5) {
          const height = 30 + Math.random() * 60;
          const y = 50 + Math.random() * (canvas.height - 100 - height);
          newObs.push({
            x: canvas.width,
            y,
            width: 25 + Math.random() * 20,
            height,
          });
        }

        // Vérifier les collisions
        const playerX = 80;
        const playerY = position;
        const playerSize = 30;

        for (const obs of newObs) {
          if (
            playerX + playerSize > obs.x &&
            playerX < obs.x + obs.width &&
            playerY + playerSize > obs.y &&
            playerY < obs.y + obs.height
          ) {
            setLives(l => l - 1);
            if (lives <= 1) {
              setGameState("ended");
              onGameEnd(score, Math.floor(score / 10));
            }
            // Retirer l'obstacle qui a touché
            return newObs.filter(o => o !== obs);
          }
        }

        return newObs;
      });

      // Augmenter le score progressivement
      if (frame % 10 === 0) {
        setScore(s => s + 1);
      }

      // Notifier la question
      if (frame % 120 === 0 && score > 0) {
        onQuestion(Math.floor(score / 10) % totalQuestions);
      }
    };

    const gameLoop = () => {
      update();
      draw();
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, position, obstacles, score, lives, frame, onGameEnd, onQuestion, totalQuestions]);

  // Contrôles clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        setPosition(p => Math.max(50, p - 50));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (canvas) {
          setPosition(p => Math.min(canvas.height - 70, p + 50));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full rounded-xl border-2 border-primary/30 bg-gradient-to-b from-sky-100 to-green-100"
      />
      {gameState === "ended" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <div className="bg-white p-6 rounded-xl text-center">
            <p className="text-2xl font-extrabold">Game Over!</p>
            <p className="text-lg">Score: {score}</p>
          </div>
        </div>
      )}
      <div className="mt-2 text-xs text-muted-foreground text-center">
        ⬆️ Espace/↑ pour sauter · ⬇️ pour descendre
      </div>
    </div>
  );
}