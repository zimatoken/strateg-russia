import { useEffect, useState } from 'react';
import { dataStore, AppData } from '../core/dataStore';

export function useDataStore() {
  const [data, setData] = useState<AppData>(() => dataStore.getAllData());

  useEffect(() => {
    const unsub = dataStore.subscribe((newData) => {
      setData(newData);
    });
    return () => unsub();
  }, []);

  return data;
}

export default useDataStore;
