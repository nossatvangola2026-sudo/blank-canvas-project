import { Play, Clock, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TaskCardProps {
  title: string;
  channelName: string;
  videoId: string;
  duration: number;
  reward: number;
  index: number;
}

const TaskCard = ({ title, channelName, videoId, duration, reward, index }: TaskCardProps) => {
  const navigate = useNavigate();

  const handleWatch = () => {
    navigate("/auth");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  return (
    <div 
      className="group glass rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:glow-sm animate-fade-in-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={thumbnailUrl} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center glow-primary">
            <Play className="h-8 w-8 fill-primary-foreground text-primary-foreground ml-1" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-background/80 backdrop-blur-sm text-xs font-medium flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDuration(duration)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{channelName}</p>

        <div className="flex items-center justify-between">
          {/* Reward */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-bold text-primary">Kz {reward.toFixed(2)}</span>
          </div>

          {/* Watch Button */}
          <Button variant="default" size="sm" onClick={handleWatch}>
            Assistir
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
