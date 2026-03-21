-- 创建备忘录表
CREATE TABLE public.memos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  reminder_time TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "Users can view their own memos" 
ON public.memos 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own memos" 
ON public.memos 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own memos" 
ON public.memos 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own memos" 
ON public.memos 
FOR DELETE 
USING (auth.uid() = created_by);

-- 创建自动更新时间戳的触发器
CREATE TRIGGER update_memos_updated_at
BEFORE UPDATE ON public.memos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();