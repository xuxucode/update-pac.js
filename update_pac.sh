#!/bin/bash
#
# 从 gfwlist 更新 pac.js

readonly GFWLIST_PATH="https://gitlab.com/gfwlist/gfwlist/raw/master/gfwlist.txt"

# 扩展域名，添加额外需要代理的域名
declare -a EXTEND_DOMAINS
EXTEND_DOMAINS=( github.com githubusercontent.com )
readonly EXTEND_DOMAINS

echo -e "下载 gfwlist.txt..."

# 开头
cat << 'EOF' > pac.js
var V2Ray = "SOCKS5 127.0.0.1:1081; SOCKS 127.0.0.1:1081; DIRECT;";

var domains = [
EOF

# 域名
for line in "${EXTEND_DOMAINS[@]}"; do
  echo "  \"${line}\"," >> pac.js
done;

while IFS= read -r line; do
  if [[ "${line}" == .* ]]; then
    echo "  \"${line:1}\"," >> pac.js
  fi
  if [[ "${line}" == \|\|* ]]; then
    echo "  \"${line:2}\"," >> pac.js
  fi
done < <(curl -sSfL "${GFWLIST_PATH}" | tr -d '\n' | base64 --decode)

# 结尾
cat << 'EOF' >> pac.js
];

function FindProxyForURL(url, host) {
    for (var i = domains.length - 1; i >= 0; i--) {
    	if (dnsDomainIs(host, domains[i])) {
            return V2Ray;
    	}
    }
    return "DIRECT";
}
EOF

echo -e "\n\033[32m更新完成 pac.js\033[0m\n"
