import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { API_BASE_URL } from '../config/api';

type UserContextValue = {
  userId: string | null;
};

const UserContext = createContext<UserContextValue>({ userId: null });

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/users/bootstrap`, { method: 'POST' })
      .then((response) => response.json())
      .then((user) => setUserId(user.id))
      .catch((error) => console.error('Bootstrap utilisateur échoué', error));
  }, []);

  return <UserContext.Provider value={{ userId }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
