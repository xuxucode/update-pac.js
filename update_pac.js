#!/usr/bin/env node

'use strict';

const https = require('https');
const path = require('path');
const fs = require('fs');

const GFWLIST_PATH = "https://gitlab.com/gfwlist/gfwlist/raw/master/gfwlist.txt";
// const GFWLIST_PATH = "https://bitbucket.org/gfwlist/gfwlist/raw/HEAD/gfwlist.txt"

// 扩展域名，添加额外需要代理的域名
const extendDomains = [
  'github.com',
];

/**
 * https GET 请求
 * @param {string} path File path
 * @returns {Promise<string>}
 */
function httpsGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.get(path, { timeout: 30 * 1000 });
    req.on('response', res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('statusCode=' + res.statusCode));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', err => reject(err));
  });
}

// 获取域名
async function getDomains() {
  const rawData = await httpsGet(GFWLIST_PATH);
  const compactData = rawData.replace('/\n/g', '');
  const ruleData = Buffer.from(compactData, 'base64').toString();
  const ruleList = ruleData.split('\n');

  const domains = [].concat(extendDomains);
  for (const rule of ruleList) {
    if (rule.startsWith('.')){
      domains.push(rule.slice(1));
    }
    if (rule.startsWith('||')) {
      domains.push(rule.slice(2));
    }
  }

  // 去重
  const domainSet = new Set(domains);
  console.log(`gfwlist.txt: rules=${ruleList.length}, domains=${domainSet.size}`);
  return Array.from(domainSet);
}

/**
 * 写入 pac.js
 * @param {string[]} domains
 * @param {string} target pac.js 文件路径
 */
async function writeFile(domains, target) {
  const content = `var V2Ray = "SOCKS5 127.0.0.1:1081; SOCKS 127.0.0.1:1081; DIRECT;";

var domains = [
  ${domains.map(d => `"${d}"`).join(',')}
];

function FindProxyForURL(url, host) {
    for (var i = domains.length - 1; i >= 0; i--) {
    	if (dnsDomainIs(host, domains[i])) {
            return V2Ray;
    	}
    }
    return "DIRECT";
}
  `;

  fs.writeFileSync(target, content, 'utf8');
}

(async () => {
  console.log('下载 gfwlist.txt...')
  const domains = await getDomains();

  // 在当前目录写入 pac.js
  const target = path.join(__dirname, 'pac.js');
  await writeFile(domains, target);

  console.log('\x1b[32m%s\x1b[0m', `\n${target} 文件已更新${domains.length}个域名\n`);
})();
