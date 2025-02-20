var express = require('express');
var router = express.Router();
const formidable = require("formidable");
const saveFile = require("../utils/saveFile");
const {v4: uuidv4} = require('uuid')
const {getTaskList, getAllData, deleteTask} = require("../utils/jsonDb");
const {zipPath, imagePath} = require("../config/path");
const path = require("path");
const packDir = require("../utils/pack");
const rmdirPromise = require("../utils/delete");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


// 上传图片列表
router.post('/upload', async function (req, res, next) {
  const filesList = []
  const form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.on('file', function (filed, file) {
    // console.log(filed)
    filesList.push(file);
  });
  form.parse(req, async function (err, filed) {
    console.log(filed)
    if (!err) {
      if (filesList && filesList.length) {
        // 遍历文件，复制到public/images目录下
        const id = filed.taskId[0];
        const result = await saveFile(id, filesList, filed)
        res.send({
          code: 0,
          data: result
        })
      } else {
        res.send({
          code: -1,
          data: '没有文件'
        })
      }
    } else {
      console.log(err)
    }
  })
})
router.get('/getTaskList', async function (req, res, next) {
  const taskId = req.query.taskId;
  const result = await getTaskList(taskId)
  res.send({
    code: 0,
    data: result
  })
})
// 打包下载
router.get('/downloadAll', async function (req, res, next) {
  const taskId = req.query.taskId;
  // 执行打包
  try {
    const inputPath = path.join(__dirname, '../', `${imagePath}/${taskId}`)
    const outputPath = path.join(__dirname, '../', `${zipPath}/${taskId}.zip`)
    const result = await packDir(inputPath, outputPath)
    const downloadUrl = result.split('public').at(-1)
    res.send({
      code: 0,
      data: downloadUrl
    })
  } catch (e) {
    console.log(e)
    res.send({
      code: -1,
      data: '打包失败'
    })
  }
})

// 删除旧的任务
router.get('/deleteOldTask', async function (req, res, next) {
  // 获取任务列表
  const taskList = await getAllData()
  if (!taskList) {
    return res.send({
      code: -1,
      data: '没有任务'
    })
  }
  const keys = Object.keys(taskList)
  // 删除一天前的数据
  let count = 0
  for (const key of keys) {
    const item = taskList[key];
    const createTime = item.dateTime
    const diff = Date.now() - createTime
    const day = diff / (24 * 60 * 60 * 1000)
    if (day > 1) {
      count++
      // 删除旧的任务
      const imageDir = path.join(__dirname, '../', `${imagePath}/${key})`)
      const zipDir = path.join(__dirname, '../', `${zipPath}/${key}.zip)`)
      try {
        await rmdirPromise(imageDir)
      } catch (e) {
        console.log(e)
      }
      try {
        await rmdirPromise(zipDir)
      } catch (e) {
        console.log(e)
      }
      try {
        // 删除数据库中的数据
        await deleteTask(key)
      } catch (e) {
        console.log(e)
      }
    }
  }
  if (count === 0) {
    res.send({
      code: -1,
      data: '没有过期的任务'
    })
    return
  }
  res.send({
    code: 0,
    data: `成功删除${count}条记录`
  })
})
module.exports = router;
