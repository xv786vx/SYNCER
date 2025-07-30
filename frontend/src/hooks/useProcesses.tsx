import { Process } from "../types";

export function useProcesses(
  processes: Process[],
  setProcesses: React.Dispatch<React.SetStateAction<Process[]>>
) {

  const addProcess = (
    type: string,
    message: string,
    extra: Partial<Omit<Process, "id" | "type" | "status" | "message" | "jobId">> = {},
    jobId?: string
  ) => {
    setProcesses((prev) => {
      const filtered = prev.filter(
        (p) =>
          !(
            (p.type === "sync_sp_to_yt" || p.type === "sync_yt_to_sp") &&
            (type === "sync_sp_to_yt" || type === "sync_yt_to_sp")
          )
      );
      const id = Date.now().toString();
      const isSync = type === "sync_sp_to_yt" || type === "sync_yt_to_sp";
      return [
        ...filtered,
        {
          id,
          type,
          status: isSync ? "in-progress" : "pending",
          message,
          ...extra,
          jobId,
        },
      ];
    });
    return Date.now().toString();
  };

  const updateProcess = (
    id: string,
    status: Process["status"],
    message?: string,
    interactive?: Process["interactive"]
  ) => {
    setProcesses((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status, message, interactive }
          : p
      )
    );
  };

  const removeProcess = (id: string) => {
    setProcesses((prev) => prev.filter((p) => p.id !== id));
  };

  return { processes, addProcess, updateProcess, removeProcess, setProcesses };
}