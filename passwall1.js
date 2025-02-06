export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.slice(1).split('/');
    let nodeCount = 10;
    let targetUrl = "";

    if (!isNaN(pathParts[0])) {
      nodeCount = parseInt(pathParts[0], 10);
      targetUrl = decodeURIComponent(pathParts.slice(1).join('/')) + url.search;
    } else {
      targetUrl = decodeURIComponent(url.pathname.slice(1) + url.search);
    }

    if (!/^https?:\/\//.test(targetUrl)) {
      return new Response(`无效的 URL 格式`, { status: 400 });
    }

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        },
      });

      if (!response.ok) {
        return new Response(`无法访问目标链接`, { status: 500 });
      }

      const content = await response.text();

      let nodes = [];
      const base64Regex = /^[A-Za-z0-9+/=\s]+$/;

      if (base64Regex.test(content.trim())) {
        try {
          const decodedContent = atob(content.replace(/\s+/g, ''));
          nodes = decodedContent
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
        } catch (e) {
          return new Response(`Base64 解码失败`, { status: 400 });
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
      if (nodes.length === 0) {
        return new Response(`订阅中没有有效的节点`, { status: 400 });
      }

      const selectedNodes = [];
      const testedNodes = new Set();
      let passedNodesCount = 0;

      while (selectedNodes.length < nodeCount && testedNodes.size < nodes.length) {
        const randomIndex = Math.floor(Math.random() * nodes.length);
        const node = nodes[randomIndex];

        if (testedNodes.has(node)) {
          continue;
        }

        testedNodes.add(node);
        const { ipAddress, port } = extractIpAndPort(node);

        if (isValidDomain(ipAddress) && isValidPort(port)) {
          selectedNodes.push(node);
          passedNodesCount++;
        }
      }

      if (selectedNodes.length < nodeCount) {
        return new Response(`没有足够的可用节点`, { status: 400 });
      }

      const finalNodes = selectedNodes.map((node, index) => {
        const nameIndex = `节点${String(index + 1).padStart(2, "0")}`;
        if (node.startsWith("vmess://")) {
          try {
            const decodedNode = JSON.parse(atob(node.slice(8)));
            decodedNode.ps = nameIndex;
            return "vmess://" + btoa(encodeUTF8(JSON.stringify(decodedNode)));
          } catch (e) {
            return node;
          }
        } else {
          return node.replace(/#.*$/, `#${nameIndex}`);
        }
      });

      const finalContent = btoa(encodeUTF8(finalNodes.join("\n")));

      return new Response(finalContent, {
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      return new Response(`处理出错`, { status: 500 });
    }
  },
};

function encodeUTF8(input) {
  return new TextEncoder().encode(input).reduce((acc, byte) => acc + String.fromCharCode(byte), "");
}

function extractIpAndPort(node) {
  try {
    let url;
    if (node.startsWith('vmess://')) {
      const decodedNode = JSON.parse(atob(node.slice(8)));
      url = new URL(`http://${decodedNode.add}:${decodedNode.port}`);
    } else {
      url = new URL(node);
    }
    return {
      ipAddress: url.hostname,
      port: url.port
    };
  } catch (e) {
    return {
      ipAddress: '',
      port: ''
    };
  }
}

function isValidDomain(domain) {
  const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/;
  return domainRegex.test(domain);
}

function isValidPort(port) {
  const portNumber = parseInt(port, 10);
  return portNumber >= 1 && portNumber <= 65535;
}
