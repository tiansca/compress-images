const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function packDir(input, outputPath) {
  if (!input || !outputPath) {
    return Promise.reject('input or output is empty');
  }
  return new Promise((resolve, reject) => {
    // 如果output存在，则删除
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    // 创建输出流（可替换为HTTP响应流）
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } }); // 最高压缩级别

    // 绑定管道和事件监听
    output.on('close',  () => resolve(outputPath));
    archive.on('error',  (err) => { reject(err) });

    archive.pipe(output);

// 添加整个目录（支持过滤配置）
    archive.directory(input, false);


// 执行压缩
    archive.finalize();
  })
}

module.exports = packDir;