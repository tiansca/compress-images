// 定义参数对象
const args = {
  // 默认值
  quality: 70,
  // 默认值
  format: '',
  // 默认值
  width: 0,
  // 默认值
  height: 0,
  // 默认值
  rotate: 0,
  // 默认值
  colors: 256,
  // 默认值
  colours: 256
}
// 文件列表
let filesList = []
document.querySelector('#quality').addEventListener('input', function (e) {
  console.log(e)
  document.querySelector('#quality-value').innerText = e.target.value
  args.quality = e.target.value
})
document.querySelector('#format').addEventListener('change', function (e) {
  args.format = e.target.value
})
document.querySelector('#width').addEventListener('input', function (e) {
  args.width = e.target.value
})
document.querySelector('#height').addEventListener('input', function (e) {
  args.height = e.target.value
})
document.querySelector('#rotate').addEventListener('input', function (e) {
  args.rotate = e.target.value
})
// document.querySelector('#colors').addEventListener('input', function (e) {
//   args.colors = e.target.value
// })
document.querySelector('#colours').addEventListener('input', function (e) {
  args.colours = e.target.value
})

// 拖动上传
document.querySelector('#upload-box').addEventListener('dragover', function (e) {
  e.preventDefault()
  e.stopPropagation()
  this.classList.add('dragover')

})
document.querySelector('#upload-box').addEventListener('dragleave', function (e) {
  e.preventDefault()
  e.stopPropagation()
  this.classList.remove('dragover')
})
document.querySelector('#upload-box').addEventListener('drop', function (e) {
  e.preventDefault()
  e.stopPropagation()
  console.log(e.dataTransfer.files)
  this.classList.remove('dragover')
  uploadFiles(e.dataTransfer.files)
})
// 点击上传
document.querySelector('#upload-box').addEventListener('click', function (e) {
  e.preventDefault()
  e.stopPropagation()
  document.querySelector('#file-upload').click()
})
document.querySelector('#file-upload').addEventListener('change', async function (e) {
  if (e.target.files.length) {
    // 校验，上传
    await uploadFiles(e.target.files)
    // 清空文件选取
    document.querySelector('#file-upload').value = ''
  }
})

function checkFiles(files) {
  if (files.length > 20) {
    alert('最多上传20张图片')
    return false
  }
  // 遍历文件，判断文件类型及大小
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fileType = file.type
    const fileSize = file.size
    if (fileType.indexOf('image') === -1) {
      alert('请上传图片')
      return false
    }
    if (fileSize > 1024 * 1024 * 10) {
      alert('图片大小不能超过10M')
      return false
    }
  }
  // 角度是否为90的倍数
  if (args.rotate % 90 !== 0) {
    alert('旋转角度必须为90的倍数')
    return false
  }
  return true
}

// 生成唯一id
function uuidv4() {
  if (crypto && crypto.getRandomValues && Uint8Array) {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })

}

const uuid = uuidv4()

// 上传文件
async function uploadFiles(files) {
  const checkRes = checkFiles(files)
  if (!checkRes) {
    return
  }
  // 生成唯一id
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    console.log(file)
    filesList.push({
      name: file.name,
      size: file.size,
      status: 0
    })
    // 构建form对象
    const form = new FormData()
    form.append('file', file)
    // 插入参数
    for (const key in args) {
      if (args.hasOwnProperty(key)) {
        const element = args[key];
        form.append(key, element)
      }
    }
    form.append('taskId', uuid)
    uploadFile(form)
  }
  // 插入文件列表
  appendFilesList(filesList)
  if (getListTimer) {
    clearInterval(getListTimer)
  }
  getListTimer = setInterval(getTaskList, 3000)
}

function uploadFile(formData) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/upload', true);

  // 监听上传进度
  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = (event.loaded / event.total) * 100;
      console.log(`上传进度: ${Math.floor(percent)}%`);
      // 回写到页面
      const fileName = formData.get('file').name
      updateFileItemProgress(fileName, Math.floor(percent))
    }
  };

  xhr.onload = () => {
    console.log('上传完成');
  };
  xhr.send(formData);
}

// 插入文件列表
function appendFilesList(list) {
  document.querySelector('#file-list')?.classList.remove('hidden')
  document.querySelector('.download-all-wrap').classList.remove('hidden')
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    let itemDom = document.querySelector('.file-item.hidden').cloneNode(true)
    let newDom = true
    // 查找列表中是否有该文件
    if (document.querySelector(`#file-list .file-item[data-name="${item.name}"]`)) {
      itemDom = document.querySelector(`#file-list .file-item[data-name="${item.name}"]`)
      newDom = false
    }
    itemDom.classList.remove('hidden')
    itemDom.setAttribute('data-name', item.name)
    itemDom.querySelector('.file-name').innerText = item.name
    itemDom.querySelector('.file-size').innerText = formatBytes(item.size)
    itemDom.querySelector('.file-status-text').innerHTML = '上传中'
    itemDom.querySelector('.compressed-size').innerText = `-`
    itemDom.querySelector('.ratio').innerText = `-`
    itemDom.querySelector('.download-button').classList.add('disable')
    if (newDom) {
      document.querySelector('#file-list').appendChild(itemDom)
    }
  }
  filesList = []
}

// 将字节改为kb或者mb
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function updateFileItemProgress(fileName, percent) {
  const fileItem = document.querySelector(`#file-list .file-item[data-name="${fileName}"]`)
  if (fileItem) {
    fileItem.querySelector('.file-progress-bar').style.width = `${percent}%`
    if (percent === 100) {
      setTimeout(() => {
        fileItem.querySelector('.file-status-text').innerText = '压缩中'
      }, 500)
    }
  }
}

// 获取任务列表
let getListTimer = null
let uploadingFiles = []
async function getTaskList() {
  // 获取上传中的文件列表
  uploadingFiles = []
  const domList = document.querySelectorAll('#file-list .file-item')
  if (domList && domList.length) {
    for (let i = 0; i < domList.length; i++) {
      if (domList[i].querySelector('.file-status-text').innerText.indexOf('上传中') !== -1 && domList[i].getAttribute('data-name')) {
        uploadingFiles.push(domList[i].getAttribute('data-name'))
      }
    }
  }

  const res = await fetch(`/getTaskList/?taskId=${uuid}`)
  console.log(res)
  if (res.ok) {
    const data = await res.json()
    if (data.code === 0) {
      const list = data.data
      const resMap = {}
      let allFinish = true
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        resMap[item.name] = item
        let format = args.format
        if (format === '') {
          // 获取文件扩展名
          format = item.name.split('.').pop()
          // 转为小写
          format = format.toLowerCase()
        }
        if (item.status === 'waiting' || item.url.indexOf(format) === -1) {
          allFinish = false
        }
      }
      if (uploadingFiles && uploadingFiles.length) {
        allFinish = false
      }
      if (allFinish && list.length >= document.querySelectorAll('#file-list .file-item:not(.hidden)').length) {
        // setTimeout(() => {
          clearInterval(getListTimer)
        // }, 4000)

      }
      for (let i = 0; i < domList.length; i++) {
        const dom = domList[i];
        const fileName = dom.getAttribute('data-name')
        if (!fileName || !resMap[fileName]) {
          continue
        }
        const itemData = resMap[fileName]
        updateListItem(dom, itemData)
      }
    }
  }
}
function updateListItem(dom, itemData) {
  let format = args.format
  if (format === '') {
    // 获取文件扩展名
    format = itemData.name.split('.').pop()
    // 转为小写
    format = format.toLowerCase()
  }
  // dom.querySelector('.file-status-text').innerText = itemData.status === 'waiting' ? '压缩中' : '压缩成功'
  if (uploadingFiles.indexOf(itemData.name) > -1 || itemData.url.indexOf(format) === -1) {
    return
  }
  if (itemData.status === 'success') {
    const successSvg = document.querySelector('svg.success-icon')?.cloneNode(true)
    successSvg.style.display = 'inline'
    dom.querySelector('.file-status-text').innerText = ''
    dom.querySelector('.file-status-text').appendChild(successSvg)
    dom.querySelector('.compressed-size').innerText = formatBytes(itemData.compressedSize)
    dom.querySelector('.ratio').innerText = `${Math.floor((itemData.compressedSize - itemData.size) / itemData.size * 100)}%`
    dom.querySelector('.download-button').classList.remove('disable')
    dom.querySelector('.download-button').onclick = () => {
      downloadFile(itemData.url)
    }
    dom.setAttribute('data-url', itemData.url)
    dom.querySelector('.file-name').classList.remove('disable')
    dom.querySelector('.file-name').onclick = () => {
      // 获取所有图片
      const imagesDom = document.querySelectorAll('#file-list .file-item[data-url]')
      const images = []
      let index = 0
      for (let i = 0; i < imagesDom.length; i++) {
        const image = imagesDom[i];
        images.push(image.getAttribute('data-url'))
        const name = image.getAttribute('data-name')
        if (name === itemData.name) {
          index = i
        }
      }
      previewImage({
        images: images,
        index: index,
        loop: false
      })
    }
  } else if (itemData.status === 'waiting') {
    dom.querySelector('.file-status-text').innerText = '压缩中'
  }
}

function downloadFile(url, name) {
  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(url, name)
  } else {
    const a = document.createElement('a')
    a.href = url
    // 去掉url中?及?后的参数
    url= url.split('?')[0]
    if (!name) {
      name = url.split('\\').pop().split('/').pop()
    }
    // 解析文件名称，兼容中文，去除多余路径，windows路径以“\\”分隔，linux路径以“/”分隔
    a.download = name
    console.log(a.download)
    a.click()
  }
}

// 下载所有
function downloadAll() {
  const downloadButton = document.querySelector('.download-all-wrap .download-all')
  if (downloadButton) {
    downloadButton.onclick = async () => {
      const res = await fetch(`/downloadAll/?taskId=${uuid}`)
      if (res.ok) {
        const data = await res.json()
        if (data.code === 0) {
          const downloadUrl = data.data
          downloadFile(downloadUrl)
        }
      }
    }
  }
}
downloadAll()

// 限制所有输入框只能输入大于0的数字
document.querySelectorAll('input[type="number"][min="0"]').forEach(input => {
  input.addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
    if (this.value < 0) {
      this.value = 0;
    }
  });
});

// 限制有max=256的输入框，只能输入0-255的数字
document.querySelectorAll('input[type="number"][max="256"]').forEach(input => {
  input.addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
    if (this.value > 256) {
      this.value = 256;
    }
  });
});
