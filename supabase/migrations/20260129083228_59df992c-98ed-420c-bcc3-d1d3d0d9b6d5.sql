-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Allow anonymous users to view active tasks on landing page
DROP POLICY IF EXISTS "Anyone authenticated can view active tasks" ON public.tasks;

CREATE POLICY "Anyone can view active tasks"
ON public.tasks
FOR SELECT
USING (status = 'active'::task_status);

-- Keep admin policy for full management
-- (Already exists: "Admins can manage tasks")