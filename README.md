# vpnnode-format

1、格式化订阅节点的备注/节点名称，随机选取其中固定的10个节点。<br>
2、如果订阅链接里的节点数量不足10个，就任意重复有的节点，补足10个节点。<br>
3、节点名称都为：节点01，节点02，节点03，节点04，节点05，节点06，节点07，节点08，节点09，节点10。<br>
4、节点类型支持：vmess,vless,ss,tuic,hysteria。<br>
5、节点输出格式为base64。<br>


#可以直接cloudflare worker 部署。<br>
绑定域名后，使用格式为 https://域名/https://订阅链接。<br>


passwall1.js中增加 https://域名/节点数/https://订阅链接  中节点数部分
