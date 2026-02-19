import { createContext, useContext } from 'react';

interface InputLockContextValue {
  isLocked: () => boolean;
  lock: () => void;
  unlock: () => void;
}

export const InputLockContext = createContext<InputLockContextValue>({
  isLocked: () => false,
  lock: () => {},
  unlock: () => {},
});

export function useInputLock() {
  return useContext(InputLockContext);
}

export function createInputLock(): InputLockContextValue {
  const ref = { current: false };
  return {
    isLocked: () => ref.current,
    lock: () => { ref.current = true; },
    unlock: () => { ref.current = false; },
  };
}
