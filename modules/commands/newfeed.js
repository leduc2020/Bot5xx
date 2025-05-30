module.exports.config = {
    name: "newfeed",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "NTKhang",
    description: "Tạo bài viết mới ở acc bot",
    commandCategory: "Tiện ích",
    cooldowns: 5
};

async function uploadMedia(api, attachments, botID) {
    let uploads = [];
    for (const attachment of attachments) {
        if (attachment.type === "photo") {
            const form = {
                file: attachment
            };
            uploads.push(api.httpPostFormData(`https://upload.facebook.com/${botID}/photos`, form));
        } else if (attachment.type === "video") {
            const form = {
                video: attachment
            };
            uploads.push(api.httpPostFormData(`https://upload.facebook.com/${botID}/videos`, form));
        }
    }
    return Promise.all(uploads);
}

module.exports.run = async ({ event, api }) => {
    const { threadID, messageID, senderID } = event;
    const uuid = getGUID();
    const formData = {
        "input": {
            "composer_entry_point": "inline_composer",
            "composer_source_surface": "timeline",
            "idempotence_token": uuid + "_FEED",
            "source": "WWW",
            "attachments": [],
            "audience": {
                "privacy": {
                    "allow": [],
                    "base_state": "FRIENDS", // SELF EVERYONE
                    "deny": [],
                    "tag_expansion_state": "UNSPECIFIED"
                }
            },
            "message": {
                "ranges": [],
                "text": ""
            },
            "with_tags_ids": [],
            "inline_activities": [],
            "explicit_place_id": "0",
            "text_format_preset_id": "0",
            "logging": {
                "composer_session_id": uuid
            },
            "tracking": [
                null
            ],
            "actor_id": api.getCurrentUserID(),
            "client_mutation_id": Math.floor(Math.random() * 17)
        },
        "displayCommentsFeedbackContext": null,
        "displayCommentsContextEnableComment": null,
        "displayCommentsContextIsAdPreview": null,
        "displayCommentsContextIsAggregatedShare": null,
        "displayCommentsContextIsStorySet": null,
        "feedLocation": "TIMELINE",
        "feedbackSource": 0,
        "focusCommentID": null,
        "gridMediaWidth": 230,
        "groupID": null,
        "scale": 3,
        "privacySelectorRenderLocation": "COMET_STREAM",
        "renderLocation": "timeline",
        "useDefaultActor": false,
        "inviteShortLinkKey": null,
        "isFeed": false,
        "isFundraiser": false,
        "isFunFactPost": false,
        "isGroup": false,
        "isTimeline": true,
        "isSocialLearning": false,
        "isPageNewsFeed": false,
        "isProfileReviews": false,
        "isWorkSharedDraft": false,
        "UFI2CommentsProvider_commentsKey": "ProfileCometTimelineRoute",
        "hashtag": null,
        "canUserManageOffers": false
    };

    return api.sendMessage(`Chọn đối tượng có thể nhìn thấy bài viết này của bạn\n1. Mọi người\n2. Bạn bè\n3. Chỉ mình tôi`, threadID, (e, info) => {
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            formData,
            type: "whoSee"
        });
    }, messageID);
};

module.exports.handleReply = async ({ event, api, handleReply }) => {
    const { type, author, formData } = handleReply;
    if (event.senderID != author) return;
    const axios = require("axios");
    const fs = require("fs-extra");
    const { threadID, messageID, senderID, attachments, body } = event;
    const botID = api.getCurrentUserID();

    if (type === "whoSee") {
        if (!["1", "2", "3"].includes(body)) return api.sendMessage('Vui lòng chọn 1 trong 3 mục ở trên', threadID, messageID);
        formData.input.audience.privacy.base_state = body == 1 ? "EVERYONE" : body == 2 ? "FRIENDS" : "SELF";
        api.unsendMessage(handleReply.messageID, () => {
            api.sendMessage(`Phản hồi tin nhắn này kèm nội dung bài viết, nếu muốn để trống hãy reply 0`, threadID, (e, info) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    formData,
                    type: "content"
                });
            }, messageID);
        });
    } else if (type === "content") {
        if (event.body != "0") formData.input.message.text = event.body;
        api.unsendMessage(handleReply.messageID, () => {
            api.sendMessage(`Phản hồi tin nhắn này kèm ảnh (có thể gửi nhiều ảnh, nếu không muốn đăng ảnh hãy reply 0`, threadID, (e, info) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    formData,
                    type: "image"
                });
            }, messageID);
        });
    } else if (type === "image") {
        if (event.body != "0") {
            const allStreamFile = [];
            const pathImage = __dirname + `/cache/imagePost.png`;
            for (const attach of attachments) {
                if (attach.type != "photo") continue;
                const getFile = (await axios.get(attach.url, { responseType: "arraybuffer" })).data;
                fs.writeFileSync(pathImage, Buffer.from(getFile));
                allStreamFile.push(fs.createReadStream(pathImage));
            }
            const uploadFiles = await uploadMedia(api, allStreamFile, botID);
            for (let upload of uploadFiles) {
                const result = JSON.parse(upload.replace("for (;;);", ""));
                formData.input.attachments.push({
                    "photo": {
                        "id": result.payload.photoID.toString(),
                    }
                });
            }
        }
        api.unsendMessage(handleReply.messageID, () => {
            api.sendMessage(`Bắt đầu tạo bài viết....`, threadID, (e, info) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    formData,
                    type: "video"
                });
            }, messageID);
        });
    } else if (type === "video") {
        if (event.body != "0") {
            const allStreamFile = [];
            const pathVideo = __dirname + `/cache/videoPost.mp4`;
            for (const attach of attachments) {
                if (attach.type != "video") continue;
                const getFile = (await axios.get(attach.url, { responseType: "arraybuffer" })).data;
                fs.writeFileSync(pathVideo, Buffer.from(getFile));
                allStreamFile.push(fs.createReadStream(pathVideo));
            }
            const uploadFiles = await uploadMedia(api, allStreamFile, botID);
            for (let upload of uploadFiles) {
                const result = JSON.parse(upload.replace("for (;;);", ""));
                formData.input.attachments.push({
                    "video": {
                        "id": result.payload.videoID.toString(),
                        "notify_when_processed": true
                    }
                });
            }
        }
        const form = {
            av: botID,
            fb_api_req_friendly_name: "ComposerStoryCreateMutation",
            fb_api_caller_class: "RelayModern",
            doc_id: "7711610262190099",
            variables: JSON.stringify(formData)
        };

        api.httpPost('https://www.facebook.com/api/graphql/', form, (e, info) => {
            api.unsendMessage(handleReply.messageID);
            try {
                if (e) throw e;
                if (typeof info == "string") info = JSON.parse(info.replace("for (;;);", ""));
                const postID = info.data.story_create.story.legacy_story_hideable_id;
                const urlPost = info.data.story_create.story.url;
                if (!postID) throw info.errors;
                try {
                    fs.unlinkSync(__dirname + "/cache/imagePost.png");
                    fs.unlinkSync(__dirname + "/cache/videoPost.mp4");
                } catch (e) {}
                return api.sendMessage(`» Đã tạo bài viết thành công\n» postID: ${postID}\n» urlPost: ${urlPost}`, threadID, messageID);
            } catch (e) {
                console.error(e);
                return api.sendMessage(`Tạo bài viết thất bại, vui lòng thử lại sau`, threadID, messageID);
            }
        });
    }
};

function getGUID() {
    var sectionLength = Date.now();
    var id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.floor((sectionLength + Math.random() * 16) % 16);
        sectionLength = Math.floor(sectionLength / 16);
        var _guid = (c == "x" ? r : (r & 7) | 8).toString(16);
        return _guid;
    });
    return id;
}