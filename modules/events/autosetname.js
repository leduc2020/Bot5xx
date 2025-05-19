const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
this.config = {
 name: "autosetname",
 eventType: ["log:subscribe"],
 version: "1.0.3",
 credits: "DongDev",
 description: "Tự động set biệt danh thành viên mới"
};
this.run = async function({ api, event, Users }) {
 const threadID = event.threadID;
 const pathData = path.join(__dirname, "../../modules/commands/data", "autosetname.json");
 const dataJson = fs.readFileSync(pathData, "utf-8");
 const threadData = JSON.parse(dataJson).find(item => item.threadID === threadID);
 if (!threadData || (!threadData.nameUser && threadData.timejoin === false)) return;
 const setName = threadData.nameUser;
 for (const info of event.logMessageData.addedParticipants) {
 const idUser = info.userFbId;
 await new Promise(resolve => setTimeout(resolve, 1000));
 const userInfo = await api.getUserInfo(idUser);
 const name = userInfo[idUser].name;
 let formattedName;
 if (threadData.timejoin === true) {
 formattedName = (setName ? setName + " " : "") + name + " (" + moment().format("HH:mm:ss | DD/MM/YYYY") + ")";
 } else {
 formattedName = setName ? setName + " " + name : name;
 }
 if (formattedName !== name) {
 await api.changeNickname(formattedName, threadID, idUser);
 }
 }
 api.sendMessage("✅ Thực thi auto setname cho thành viên mới!", threadID, event.messageID);
};