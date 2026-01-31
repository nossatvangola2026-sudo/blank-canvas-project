import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import TaskCard from "./TaskCard";
import { Loader2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  channel_name: string;
  video_id: string;
  duration_seconds: number;
  reward_amount: number;
}

const TasksSection = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTasks(data);
      }
      setIsLoading(false);
    };

    fetchTasks();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section id="tasks" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/50 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Tarefas <span className="text-gradient">Disponíveis</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Escolha um vídeo, assista até o final e receba sua recompensa instantaneamente.
          </p>
        </div>

        {/* Tasks Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Nenhuma tarefa disponível no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                title={task.title}
                channelName={task.channel_name}
                videoId={task.video_id}
                duration={task.duration_seconds}
                reward={task.reward_amount}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TasksSection;
