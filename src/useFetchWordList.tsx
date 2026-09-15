import { useEffect, useState } from "react";

export const useFetchWordList = (fetching: boolean, setFetching: Function, isOverlay: boolean) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (fetching || !isOverlay) return;
    console.log("Fetching word list");

    setFetching(true);

    const randomNumber = Math.floor(Math.random() * 600001);
    const url = `https://cryptics.georgeho.org/data/clues.json?_next=${randomNumber}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json.rows))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [fetching]);

  return { data, loading, error };
};
