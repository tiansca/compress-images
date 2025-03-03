const {imagePath} = require('../config/path')
const fs = require('fs')
const path = require('path')
const JSONDB = require('./jsonDb')
const sharp = require('sharp')
/*
* taskId: 任务id
* files: 文件列表
* type: 扩展名*/
const saveFile = (taskId, files, option) => {
  return new Promise(async (resolve, reject) => {
    const tasks = []
    // 创建taskId目录
    if (!fs.existsSync(path.join(__dirname, '../', `${imagePath}/${taskId}`))) {
      fs.mkdirSync(path.join(__dirname, '../', `${imagePath}/${taskId}`))
    }
    tasks.push(JSONDB.setTask(taskId, files.map((item, index) => {
      return {
        name: item.originalFilename,
        status: 'waiting',
        size: item.size
      }
    })))
    try {
      const res = await Promise.all(tasks)
      resolve(res)
    } catch (e) {
      reject(e)
    }
    files.forEach((file, index) => {
      const {filepath, originalFilename} = file
      // 获取扩展名
      const fileName = `${originalFilename}`
      const targetPath = path.join(__dirname, '../', `${imagePath}/${taskId}`, fileName)
      // console.log(targetPath, 'targetPath')
      compressImage(filepath, targetPath, option, fileName, taskId, index, file.size)
    })
  })
}
const compressImage = async (inputImagePath, targetImagePath, option, fileName, taskId, index, size) => {
  const quality = Number(option.quality[0]) || 75
  // 获取扩展名

  let extendName = path.extname(targetImagePath).toLowerCase()
  if (extendName) {
    extendNameArr = extendName.split('.')
    if (extendNameArr.length > 1) {
      extendName = extendNameArr.at(-1)
    }
  }
  let format = option.format[0] || extendName
  let sharpObj
  if (format === 'gif') {
    sharpObj = sharp(inputImagePath, {animated: true})
  } else {
    sharpObj = sharp(inputImagePath)
  }

  // 旋转
  if (Number(option.rotate[0])) {
    sharpObj = await sharpObj.rotate(Number(option.rotate[0]))
  }

  // 如果是bmp或者svg，则转换为png
  if (format === 'bmp' || format === 'svg') {
    format = 'png'
  }
  if (format) {
    switch (format) {
      case 'png':
        sharpObj = await sharpObj.png({quality: quality, palette: true, compressionLevel: 9})
        break;
      case 'webp':
        sharpObj = await sharpObj.webp({quality: quality})
        break;
      case 'avif':
        sharpObj = await sharpObj.avif({quality: quality})
        break;
      case 'jpg':
      case 'jpeg':
        sharpObj = await sharpObj.jpeg({quality: quality, progressive: true, mozjpeg: true})
        break;
      case 'tiff':
        sharpObj = await sharpObj.tiff({quality: quality})
        break;
      case 'gif':
        sharpObj = await sharpObj.gif({colors: Number(option.colors[0]), colours: Number(option.colours[1])})
        break;
    }
  }
  // 大小，如果有宽度并且没有高度
  const width = option.width[0] ? Number(option.width[0]) : null
  const height = option.height[0] ? Number(option.height[0]) : null
  if (width && !height) {
    console.log('宽度')
    sharpObj = await sharpObj.resize({width})
  } else if (height && !width) {
    sharpObj = await sharpObj.resize({height})
  } else if (width && height) {
    sharpObj = await sharpObj.resize({width, height})
  }
  // 更改扩展名
  targetImagePath = targetImagePath.replace(/\.[^.]+$/, `.${format}`)
  sharpObj
    .withMetadata(false)
    .toFile(targetImagePath, async (err, info) => {
      if (err) {
        console.error('Error compressing image:', err);
      } else {
        console.log('Image compressed successfully:', info);
        // 获取压缩后的文件大小
        try {
          const fileSize = await fs.promises.stat(targetImagePath)
          JSONDB.setTaskStatus(taskId, {
            name: fileName,
            status: 'success',
            size: size,
            compressedSize: fileSize.size,
            url: targetImagePath.split('public')[1] + '?' + Date.now() // 防止缓存
          }, index)
        } catch (e) {
          console.error(e)
        }
      }
    });
}
module.exports = saveFile
