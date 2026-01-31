import { useEffect, useCallback } from 'react';

interface UseNavigationBlockOptions {
  isActive: boolean;
  message?: string;
}

export const useNavigationBlock = ({
  isActive,
  message = 'Se você sair agora, a tarefa será cancelada e você não receberá a recompensa. Tem certeza?',
}: UseNavigationBlockOptions) => {
  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (!isActive) return;
      event.preventDefault();
      event.returnValue = message;
      return message;
    },
    [isActive, message]
  );

  useEffect(() => {
    if (!isActive) return;

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive, handleBeforeUnload]);

  return null;
};
