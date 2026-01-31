-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create task_status enum
CREATE TYPE public.task_status AS ENUM ('active', 'inactive');

-- Create withdrawal_status enum
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    avatar_url TEXT,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    video_id TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 180,
    reward_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status task_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_completions table
CREATE TABLE public.task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    reward_earned NUMERIC(10, 2) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, task_id)
);

-- Create withdrawals table
CREATE TABLE public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status withdrawal_status NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL,
    phone_number TEXT,
    notes TEXT,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin')
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup (create profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create function to add balance after task completion
CREATE OR REPLACE FUNCTION public.add_task_completion_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET balance = balance + NEW.reward_earned
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$;

-- Create trigger to add reward on task completion
CREATE TRIGGER on_task_completed
    AFTER INSERT ON public.task_completions
    FOR EACH ROW
    EXECUTE FUNCTION public.add_task_completion_reward();

-- Create function to deduct balance on withdrawal request
CREATE OR REPLACE FUNCTION public.deduct_withdrawal_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET balance = balance - NEW.amount
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$;

-- Create trigger to deduct balance on withdrawal
CREATE TRIGGER on_withdrawal_requested
    AFTER INSERT ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION public.deduct_withdrawal_amount();

-- Create function to restore balance on withdrawal rejection
CREATE OR REPLACE FUNCTION public.handle_withdrawal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
        UPDATE public.profiles
        SET balance = balance + NEW.amount
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for withdrawal status change
CREATE TRIGGER on_withdrawal_status_changed
    AFTER UPDATE OF status ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_withdrawal_status_change();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile except balance"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- RLS Policies for user_roles (admin only)
CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for tasks
CREATE POLICY "Anyone authenticated can view active tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (status = 'active' OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage tasks"
    ON public.tasks FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for task_completions
CREATE POLICY "Users can view own completions"
    ON public.task_completions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own completions"
    ON public.task_completions FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- RLS Policies for withdrawals
CREATE POLICY "Users can view own withdrawals"
    ON public.withdrawals FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create own withdrawals"
    ON public.withdrawals FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update withdrawals"
    ON public.withdrawals FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Insert sample tasks
INSERT INTO public.tasks (title, channel_name, video_id, duration_seconds, reward_amount, status) VALUES
    ('Review Completo do Novo iPhone', 'Tech Angola', 'dQw4w9WgXcQ', 180, 75.50, 'active'),
    ('Melhores Momentos do Futebol', 'Desporto+', 'y6120QOlsfU', 240, 110.00, 'active'),
    ('Aprenda a Cozinhar Funge', 'Culinária Angolana', 'L-0j0vN2z0M', 300, 150.25, 'active'),
    ('Descubra as Belezas de Luanda', 'Viajar Angola', '3Z1_cpb0y74', 150, 60.00, 'active'),
    ('Tutorial de Maquilhagem Rápida', 'Beleza Pura', '6ZfuNTqbHE8', 200, 95.75, 'active'),
    ('Dicas de Investimento para Iniciantes', 'Finanças AO', 'ZbZSe6N_BXs', 280, 125.00, 'active');