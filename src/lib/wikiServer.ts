import TcpSocket from "react-native-tcp-socket";
import * as Network from "expo-network";
import { getAllMemories, updateTopicContent, deleteTopic } from "./memoryStorage";
import { generatePortalHtml } from "./wikiPortalHtml";

const PORT = 8042;

let server: ReturnType<typeof TcpSocket.createServer> | null = null;

export interface ServerInfo {
  url: string;
  ip: string;
  port: number;
}

function parseHttpRequest(raw: string) {
  const [requestLine, ...rest] = raw.split("\r\n");
  const [method, path] = requestLine.split(" ");
  const headerEnd = raw.indexOf("\r\n\r\n");
  const body = headerEnd >= 0 ? raw.slice(headerEnd + 4) : "";
  return { method, path: decodeURIComponent(path), body };
}

function utf8ByteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

function httpResponse(
  status: number,
  statusText: string,
  contentType: string,
  body: string
): string {
  return [
    `HTTP/1.1 ${status} ${statusText}`,
    `Content-Type: ${contentType}`,
    `Content-Length: ${utf8ByteLength(body)}`,
    "Connection: close",
    "Access-Control-Allow-Origin: *",
    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers: Content-Type",
    "",
    body,
  ].join("\r\n");
}

async function handleRequest(
  method: string,
  path: string,
  body: string
): Promise<string> {
  // CORS preflight
  if (method === "OPTIONS") {
    return httpResponse(204, "No Content", "text/plain", "");
  }

  // Serve the portal HTML
  if (method === "GET" && (path === "/" || path === "/index.html")) {
    const memories = await getAllMemories();
    const html = generatePortalHtml(memories);
    return httpResponse(200, "OK", "text/html; charset=utf-8", html);
  }

  // API: get all memories
  if (method === "GET" && path === "/api/memories") {
    const memories = await getAllMemories();
    return httpResponse(
      200,
      "OK",
      "application/json",
      JSON.stringify(memories)
    );
  }

  // API: update a memory's content
  if (method === "PUT" && path.startsWith("/api/memories/")) {
    const topic = path.slice("/api/memories/".length);
    try {
      const { content } = JSON.parse(body);
      await updateTopicContent(topic, content);
      return httpResponse(200, "OK", "application/json", '{"ok":true}');
    } catch (e: any) {
      return httpResponse(
        400,
        "Bad Request",
        "application/json",
        JSON.stringify({ error: e.message })
      );
    }
  }

  // API: delete a memory
  if (method === "DELETE" && path.startsWith("/api/memories/")) {
    const topic = path.slice("/api/memories/".length);
    try {
      await deleteTopic(topic);
      return httpResponse(200, "OK", "application/json", '{"ok":true}');
    } catch (e: any) {
      return httpResponse(
        400,
        "Bad Request",
        "application/json",
        JSON.stringify({ error: e.message })
      );
    }
  }

  return httpResponse(404, "Not Found", "text/plain", "Not found");
}

export async function startWikiServer(): Promise<ServerInfo> {
  if (server) {
    throw new Error("Server already running");
  }

  const ip = await Network.getIpAddressAsync();

  return new Promise((resolve, reject) => {
    server = TcpSocket.createServer((socket) => {
      let data = "";

      socket.on("data", (chunk) => {
        data += chunk.toString();

        // Wait for full HTTP request (headers end with \r\n\r\n)
        if (!data.includes("\r\n\r\n")) return;

        const { method, path, body } = parseHttpRequest(data);
        data = "";

        handleRequest(method, path, body)
          .then((response) => {
            socket.write(response);
            socket.destroy();
          })
          .catch(() => {
            socket.write(
              httpResponse(500, "Internal Server Error", "text/plain", "Error")
            );
            socket.destroy();
          });
      });

      socket.on("error", () => {
        socket.destroy();
      });
    });

    server.listen({ port: PORT, host: "0.0.0.0" }, () => {
      resolve({ url: `http://${ip}:${PORT}`, ip, port: PORT });
    });

    server.on("error", (err) => {
      server = null;
      reject(err);
    });
  });
}

export function stopWikiServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}

export function isServerRunning(): boolean {
  return server !== null;
}
