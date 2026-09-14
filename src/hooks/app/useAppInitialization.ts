import { useEffect } from 'react';
import { logService } from '@/services/logService';
import { autoIndexingQueue } from '@/services/embedding/autoIndexingQueue';

export const useAppInitialization = () => {
  useEffect(() => {
    logService.info('App initialized.');
    autoIndexingQueue.startIdleCatchup(3000);
  }, []);
};
