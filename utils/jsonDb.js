const { JsonDB, Config } = require('node-json-db');
const { Mutex } = require('async-mutex');
const db = new JsonDB(new Config("myDataBase", true, false, '/'));
const mutex = new Mutex();
console.log('实例化json db')

const JSONDB = {
  setTask: async (taskId, list) => {
    if (!taskId || !list) {
      return
    }
    const release = await mutex.acquire(); // 获取锁
    // taskId有没有
    const taskList = await JSONDB.getTaskList(taskId);
    if (taskList) {
      // 拼接数组
      // 查找元素是否存在
      for (const aListItem of list) {
        const fileIndex = taskList.findIndex(file => file.name === aListItem.name)
        if (fileIndex > -1) {
          taskList[fileIndex] = aListItem
        } else {
          taskList.push(aListItem)
        }
      }
      await db.push(`/${taskId}/list`, taskList)
      release(); // 释放锁
      await db.reload()
      return
    }
    // 没有就创建
    await db.push(`/${taskId}`, {list, dateTime: Date.now()});
    try {
      await db.save()
    } catch (e) {
      console.log('db.save() error', e)
    }
    release(); // 释放锁
    await db.reload()
  },
  setTaskStatus: async (taskId, item) => {
    const list = await JSONDB.getTaskList(taskId);
    const index = list.findIndex(file => file.name === item.name)
    await db.push(`/${taskId}/list[${index}]`, item);
  },
  getTaskList: async (taskId) => {
    try {
      return await db.getData(`/${taskId}/list`)
    } catch (e) {
      return null
    }
  },
  getAllData: async () => {
    return await db.getData('/');
  },
  deleteTask: async (taskId) => {
    await db.delete(`/${taskId}`);
  },
}
module.exports = JSONDB
