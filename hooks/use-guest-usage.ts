import { useState, useEffect } from 'react';

export function useGuestUsage() {
  const [guestCount, setGuestCount] = useState(3);
  const [isGuestLimitReached, setIsGuestLimitReached] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUsage = localStorage.getItem('guestUsage');
      if (storedUsage) {
        const usage = JSON.parse(storedUsage);
        setGuestCount(usage.count);
        if (usage.count <= 0) {
          setIsGuestLimitReached(true);
        }
      } else {
        localStorage.setItem('guestUsage', JSON.stringify({ count: 3 }));
      }
    } catch (error) {
      console.error("Could not access localStorage", error);
      setIsGuestLimitReached(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const decrementGuestCount = () => {
    if (guestCount > 0) {
      const newCount = guestCount - 1;
      localStorage.setItem('guestUsage', JSON.stringify({ count: newCount }));
      setGuestCount(newCount);
      if (newCount <= 0) {
        setIsGuestLimitReached(true);
      }
      return true;
    }
    return false;
  };

  return { guestCount, isGuestLimitReached, decrementGuestCount, loading };
}