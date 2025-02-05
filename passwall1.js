export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = decodeURIComponent(url.pathname.slice(1) + url.search);
    let logs = [];

    // 验证目标URL是否为有效的HTTP或HTTPS链接
    if (!/^https?:\/\//.test(targetUrl)) {
      logs.push(`无效的 URL 格式: ${targetUrl}`);
      return new Response(`无效的 URL 格式\n\n日志:\n${logs.join("\n")}`, { status: 400 });
    }

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        },
      });

      if (!response.ok) {
        logs.push(`无法访问目标链接: ${targetUrl}, 状态码: ${response.status}, 状态文本: ${response.statusText}`);
        return new Response(`无法访问目标链接\n\n日志:\n${logs.join("\n")}`, { status: 500 });
      }

      const content = await response.text();
      logs.push(`成功获取内容: ${content.substring(0, 100)}...`);

      let nodes = [];
      const base64Regex = /^[A-Za-z0-9+/=\s]+$/;

      if (base64Regex.test(content.trim())) {
        try {
          // 尝试解码Base64内容
          const decodedContent = atob(content.replace(/\s+/g, ''));
          logs.push(`Base64 解码成功: ${decodedContent.substring(0, 100)}...`);
          
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
          logs.push(`Base64 解码失败: ${e.message}`);
          return new Response(`Base64 解码失败\n\n日志:\n${logs.join("\n")}`, { status: 400 });
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

      logs.push(`过滤后的节点数: ${nodes.length}`);
      
      // 过滤掉包含127.0.0.1的节点
      nodes = nodes.filter((node) => !node.includes("127.0.0.1"));
      if (nodes.length === 0) {
        logs.push("订阅中没有有效的节点");
        return new Response(`订阅中没有有效的节点\n\n日志:\n${logs.join("\n")}`, { status: 400 });
      }

      // 如果节点数量不足10个，随机复制补充到10个
      while (nodes.length < 10) {
        const randomIndex = Math.floor(Math.random() * nodes.length);
        const node = nodes[randomIndex];
        nodes.push(node);
      }

      // 处理节点名称
      const finalNodes = nodes.slice(0, 10).map((node, index) => {
        const nameIndex = `节点${String(index + 1).padStart(2, "0")}`;
        if (node.startsWith("vmess://")) {
          try {
            const decodedNode = JSON.parse(atob(node.slice(8)));
            decodedNode.ps = nameIndex;
            return "vmess://" + btoa(encodeUTF8(JSON.stringify(decodedNode)));
          } catch (e) {
            logs.push(`VMess 节点解码失败: ${e.message}`);
            return node;
          }
        } else {
          return node.replace(/#.*$/, `#${nameIndex}`);
        }
      });

      const finalContent = btoa(encodeUTF8(finalNodes.join("\n")));
      logs.push(`最终输出内容: ${finalContent.substring(0, 100)}...`);

      return new Response(finalContent, {
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      logs.push(`处理出错: ${error.message}`);
      return new Response(`处理出错\n\n日志:\n${logs.join("\n")}`, { status: 500 });
    }
  },
};

function encodeUTF8(input) {
  return new TextEncoder().encode(input).reduce((acc, byte) => acc + String.fromCharCode(byte), "");
}
