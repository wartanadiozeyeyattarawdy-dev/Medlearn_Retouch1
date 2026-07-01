import { useState } from "react";
import { Play, Youtube, Loader2 } from "lucide-react";

interface YouTubeEmbedProps {
  url: string;
  title?: string;
  className?: string;
}

export function YouTubeEmbed({ url, title, className = "" }: YouTubeEmbedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extraire l'ID de la vidéo YouTube
  const getYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([\w-]+)/,
      /(?:youtu\.be\/)([\w-]+)/,
      /(?:youtube\.com\/embed\/)([\w-]+)/,
      /(?:youtube\.com\/shorts\/)([\w-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = getYouTubeId(url);

  if (!videoId) {
    return (
      <div className={`rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 text-center ${className}`}>
        <Youtube className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-sm text-destructive">URL YouTube invalide</p>
        <p className="text-xs text-muted-foreground mt-1">{url}</p>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`;

  return (
    <div className={`relative overflow-hidden rounded-xl border-2 border-border bg-black ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-white">
          <Youtube className="h-10 w-10 text-red-500 mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      <iframe
        src={embedUrl}
        title={title || "Vidéo YouTube"}
        className={`w-full aspect-video ${className}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError("Impossible de charger la vidéo");
        }}
      />
      {!loading && !error && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Youtube className="h-3 w-3 text-red-500" />
          YouTube
        </div>
      )}
    </div>
  );
}

// Composant pour afficher une vidéo dans une leçon
export function LessonVideo({ url, title }: { url: string; title?: string }) {
  if (!url) return null;

  return (
    <div className="my-4">
      <YouTubeEmbed url={url} title={title} />
      {title && (
        <p className="text-sm text-muted-foreground mt-2 text-center">{title}</p>
      )}
    </div>
  );
}