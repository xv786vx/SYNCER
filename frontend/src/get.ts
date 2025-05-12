export async function getThing(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("error");
  return res.json();
}
