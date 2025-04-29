const {imagePath} = require('../config/path')
const fs = require('fs')
const path = require('path')
const JSONDB = require('./jsonDb')
const sharp = require('sharp')
const pLimit = require('p-limit');
const limit = pLimit(2); // 限制并发数

// sharp.cache(false); // 禁用缓存，以避免内存占用过高
sharp.simd(false); // 禁用SIMD
sharp.cache({ memory: 0, files: 0 });
/*
* taskId: 任务id
* files: 文件列表
* type: 扩展名*/
const saveFile = async (taskId, files, option) => {
  try {
    // 创建任务目录
    const taskDir = path.join(__dirname, '../', `${imagePath}/${taskId}`)
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true })
    }

    // 初始化任务状态
    const fileEntries = files.map((file, index) => ({
      name: file.originalFilename,
      status: 'waiting',
      size: file.size
    }))
    await JSONDB.setTask(taskId, fileEntries)

    // 3. 使用 p-limit 包装所有任务
    const tasks = files.map((file, index) =>
      limit(async () => { // 将每个任务包装到limit中
        const { filepath, originalFilename, size } = file
        const targetPath = path.join(taskDir, originalFilename)

        try {
          await compressImage(
            filepath,
            targetPath,
            option,
            originalFilename,
            taskId,
            index,
            size
          )
        } catch (err) {
          console.error(`文件 ${originalFilename} 处理失败:`, err)
          JSONDB.setTaskStatus(taskId, {
            name: originalFilename,
            status: 'error',
            error: err.message
          }, index)
          throw err // 抛出错误以触发整体Promise.all的catch
        }
      })
    )

    // 4. 等待所有任务完成
    await Promise.all(tasks)

  } catch (err) {
    console.error('任务处理失败:', err)
    throw new Error(`文件处理失败: ${err.message}`)
  } finally {
    files = null // 帮助垃圾回收
    // 内存释放
    global.gc();
  }
}
const compressImage = async (inputImagePath, targetImagePath, option, fileName, taskId, index, size) => {
  let sharpObj;
  try {
    // 参数解析及初始化
    const quality = Number(option.quality[0]) || 75;
    let format = option.format[0] || path.extname(targetImagePath).toLowerCase().replace('.', '');
    // 处理格式特殊情况
    if (format === 'bmp' || format === 'svg') format = 'png';

    // 初始化 sharp
    sharpObj = format === 'gif'
      ? sharp(inputImagePath, { animated: true, sequentialRead: true })
      : sharp(inputImagePath, { sequentialRead: true});

    // 处理旋转
    if (option.rotate?.[0]) {
      sharpObj = sharpObj.rotate(Number(option.rotate[0]));
    }

    // 处理尺寸调整
    const width = option.width?.[0] ? Number(option.width[0]) : null;
    const height = option.height?.[0] ? Number(option.height[0]) : null;
    if (width || height) {
      var sizeOption = {}
      if (width) {
        sizeOption.width = width;
      }
      if (height) {
        sizeOption.height = height;
      }
      sharpObj = sharpObj.resize(sizeOption);
    }

    // 设置输出格式及选项
    let formatOptions = {}; // 根据格式设置对应选项
    switch (format) {
      case 'png':
        formatOptions = {quality: quality, palette: true, compressionLevel: 9,  progressive: true}
        break;
      case 'webp':
        formatOptions = {quality: quality,  progressive: true}
        break;
      case 'avif':
        formatOptions = {quality: quality,  progressive: true}
        break;
      case 'jpg':
      case 'jpeg':
        formatOptions = {quality: quality, progressive: true, mozjpeg: true,  progressive: true}
        break;
      case 'tiff':
        formatOptions = {quality: quality,  progressive: true}
        break;
      case 'gif':
        formatOptions = {colors: Number(option.colors[0]), colours: Number(option.colours[1]),  progressive: true}
        break;
    }
    sharpObj = sharpObj.toFormat(format, formatOptions);

    // 生成输出路径并处理元数据
    targetImagePath = targetImagePath.replace(/\.[^.]+$/, `.${format}`);
    await sharpObj.withMetadata(false).toFile(targetImagePath);

    // 更新任务状态
    const fileSize = (await fs.promises.stat(targetImagePath)).size;
    JSONDB.setTaskStatus(taskId, {
      name: fileName,
      status: 'success',
      size: size,
      compressedSize: fileSize,
      url: targetImagePath.split('public')[1] + '?' + Date.now()
    }, index);
  } catch (err) {
    console.error('压缩失败:', err);
    JSONDB.setTaskStatus(taskId, {
      name: fileName,
      status: 'error',
      error: err.message
    }, index);
    throw err; // 抛出错误以便外层捕获
  } finally {
    if (sharpObj) {
      sharpObj.destroy();
      sharpObj = null;
    }
    global.gc();
  }
}
module.exports = saveFile
