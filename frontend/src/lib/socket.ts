import { io as ioClient, type Socket } from "socket.io-client";

function getBackendUrl(): string {
  const url = import.meta.env.VITE_BACKEND_URL;
  if (typeof url !== "string" || !url) {
    throw new Error("VITE_BACKEND_URL is not set. Add it to your .env file.");
  }
  return url.replace(/\/$/, "");
}

export async function connectPatientSocket(token: string): Promise<Socket> {
  const backendUrl = getBackendUrl();
  return new Promise((resolve, reject) => {
    const socket = ioClient(backendUrl, {
      auth: { token },
      withCredentials: true,
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
  });
}
