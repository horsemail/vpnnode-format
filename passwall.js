export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = decodeURIComponent(url.pathname.slice(1));

    if (!/^https?:\/\//.test(targetUrl)) {
      return new Response("无效的 URL 格式", { status: 400 });
    }

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) return new Response("无法访问目标链接", { status: 500 });

      const content = await response.text();
      let nodes = [];
      const base64Regex = /^[A-Za-z0-9+/=\s]+$/;

      if (base64Regex.test(content.trim())) {
        try {
          nodes = atob(content.trim())
            .split("\n")
            .map((line) => line.trim())
            .filter(
              (line) =>
                line.startsWith("vmess://") ||
                line.startsWith("vless://") ||
                line.startsWith("ss://") ||
                line.startsWith("tuic://") ||
                line.startsWith("hysteria://")
            );
        } catch {
          return new Response("Base64 解码失败", { status: 400 });
        }
      } else {
        nodes = content
          .split("\n")
          .map((line) => line.trim())
          .filter(
            (line) =>
              line.startsWith("vmess://") ||
              line.startsWith("vless://") ||
              line.startsWith("ss://") ||
              line.startsWith("tuic://") ||
              line.startsWith("hysteria://")
          );
      }

      nodes = nodes.filter((node) => !node.includes("127.0.0.1"));
      if (nodes.length === 0) return new Response("订阅中没有有效的节点", { status: 400 });

      const selectedNodes = [];
      const nodesNeeded = 10;

      for (let i = 0; selectedNodes.length < nodesNeeded; i++) {
        const node = nodes[i % nodes.length];
        if (!node || node.trim() === "") continue;

        const nameIndex = `节点${String(selectedNodes.length + 1).padStart(2, "0")}`;

        if (node.startsWith("vmess://") || node.startsWith("vless://")) {
          try {
            if (node.startsWith("vmess://")) {
              const decodedNode = JSON.parse(atob(node.slice(8)));
              decodedNode.ps = nameIndex;
              selectedNodes.push("vmess://" + btoa(encodeUTF8(JSON.stringify(decodedNode))));
            } else {
              selectedNodes.push(node.replace(/#.*$/, `#${nameIndex}`));
            }
          } catch {
            continue;
          }
        } else {
          selectedNodes.push(node.replace(/#.*$/, `#${nameIndex}`));
        }
      }

      const finalNodes = selectedNodes.slice(0, nodesNeeded);
      const finalContent = btoa(encodeUTF8(finalNodes.join("\n")));

      return new Response(finalContent, {
        headers: { "Content-Type": "text/plain" },
      });
    } catch {
      return new Response("处理出错", { status: 500 });
    }
  },
};

function encodeUTF8(input) {
  return new TextEncoder().encode(input).reduce((acc, byte) => acc + String.fromCharCode(byte), "");
}