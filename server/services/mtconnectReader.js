const http = require('http');
const { decodeMtconnectDocument, mtconnectPath } = require('../utils/monitoringTimeline');

function readMtconnect(link) {
  const path = mtconnectPath(link.signal);
  return new Promise((resolve, reject) => {
    const request = http.get({
      host: link.host,
      port: link.port,
      path,
      timeout: 2500,
    }, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`MTConnect ответил ${response.statusCode}`));
        return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > 1024 * 1024) {
          request.destroy(new Error('Ответ MTConnect слишком большой'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        resolve(decodeMtconnectDocument(Buffer.concat(chunks).toString('utf8')));
      });
    });
    request.on('timeout', () => request.destroy(new Error('MTConnect не ответил')));
    request.on('error', reject);
  });
}

module.exports = { readMtconnect };
