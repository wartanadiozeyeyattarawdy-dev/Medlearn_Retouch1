import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toggleFollow, getFollowStatus } from "@/lib/social.functions";
import { DuoButton } from "./DuoButton";
import { Loader2, UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: (following: boolean) => void;
}

export function FollowButton({ targetUserId, onFollowChange }: FollowButtonProps) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const toggleFn = useServerFn(toggleFollow);
  const statusFn = useServerFn(getFollowStatus);

  useEffect(() => {
    const load = async () => {
      const { following } = await statusFn({ data: { targetUserId } });
      setFollowing(following);
      setLoading(false);
    };
    load();
  }, [targetUserId, statusFn]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const { following: newStatus } = await toggleFn({ data: { targetUserId } });
      setFollowing(newStatus);
      onFollowChange?.(newStatus);
    } catch (error) {
      console.error("Erreur toggle follow:", error);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  return (
    <DuoButton
      variant={following ? "ghost" : "primary"}
      size="sm"
      onClick={handleToggle}
      disabled={toggling}
    >
      {toggling ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <>
          <UserCheck className="h-4 w-4" /> Suivi
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" /> Suivre
        </>
      )}
    </DuoButton>
  );
}