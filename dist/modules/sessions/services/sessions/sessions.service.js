"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const sessions_utility_service_1 = require("../sessions-utility/sessions-utility.service");
const user_utility_service_1 = require("./../../../users/services/user-utility/user-utility.service");
const shared_service_1 = require("./../../../../services/shared/shared.service");
const process_1 = require("process");
let SessionsService = class SessionsService {
    constructor(sessionsUtilitySrvc, userUtilitySrvc, sharedSrvc) {
        this.sessionsUtilitySrvc = sessionsUtilitySrvc;
        this.userUtilitySrvc = userUtilitySrvc;
        this.sharedSrvc = sharedSrvc;
        this.GCLOUD_STORAGE = 'gcloud';
        this.GCLOUD_BUCKET = process_1.env.DG_GOOGLE_APP_STORAGE;
    }
    async getUserSessions(username) {
        if (username && typeof username === 'string') {
            const userExists = await this.userUtilitySrvc.userExists(username);
            if (typeof userExists === 'boolean') {
                if (userExists) {
                    const sessionsList = await this.sessionsUtilitySrvc.getSessionList(username);
                    if (sessionsList) {
                        return { ok: true, status: 200, data: sessionsList };
                    }
                    return { ok: false, status: 500, error: 'An error occured while reading sessions for user ' + username };
                }
                else {
                    return { ok: false, status: 400, error: 'USER ' + username + ' DOES NOT EXISTS' };
                }
            }
        }
        else {
            return { ok: false, status: 400, error: 'USERNAME EMPTY' };
        }
    }
    async createUserSessions(sessionData) {
        const userExists = await this.userUtilitySrvc.userExists(sessionData['username']);
        if (typeof userExists === 'boolean') {
            if (userExists) {
                const sessionsData = sessionData['sessions'].map(session => {
                    return Object.assign(Object.assign({}, session), { username: sessionData['username'] });
                });
                const sessionsCreated = await this.sessionsUtilitySrvc.createUserSessionsInBatch(sessionsData);
                if (sessionsCreated) {
                    return { ok: true, status: 200, data: sessionsCreated };
                }
                return { ok: false, status: 500, error: 'An error occured while creating new sessions for user ' + sessionData['username'] };
            }
            else {
                return { ok: false, status: 400, error: 'USER ' + sessionData['username'] + ' DOES NOT EXISTS' };
            }
        }
    }
    initiateUpload(sessionObject, cloudType = this.GCLOUD_STORAGE) {
        return new Promise(async (resolve, reject) => {
            if (cloudType === this.GCLOUD_STORAGE) {
                console.log('initiating gcloud upload sequence\n');
                const username = Object.keys(sessionObject)[0];
                const fileDataObject = [];
                sessionObject[username].topics.forEach(topic => {
                    fileDataObject.push({
                        filename: topic.fileData.originalname,
                        data: topic.fileData.buffer,
                    });
                });
                const filesSaved = await this.sharedSrvc.saveToTempStorage(`${username}/${sessionObject[username]['sessionid']}`, fileDataObject);
                if (filesSaved['ok']) {
                    resolve(true);
                    console.log('session object looks like ', sessionObject);
                    const isMonoConverted = await this.sessionsUtilitySrvc.convertTempFilesToMono(username, sessionObject[username]['sessionid'], sessionObject[username]['topics'][0]['name']);
                    if (isMonoConverted['ok']) {
                        const monoFileNames = fileDataObject.map(fileObj => `mono_${fileObj.filename}`);
                        this.sessionsUtilitySrvc.uploadFilesToCloudStorage(username, sessionObject[username]['sessionid'], undefined, monoFileNames).then(uploadedToCloud => {
                            console.log('process uploading to gcloud triggered successfully', uploadedToCloud);
                        })
                            .catch(error => {
                            console.log('An Error occured while triggering upload to gcloud ', error);
                        });
                    }
                }
                else {
                    reject(filesSaved['error']);
                }
            }
        });
    }
    async getUserSessionsStatus(username) {
        const sessionsData = await this.sessionsUtilitySrvc.getSessionsStatus(username);
        if (sessionsData['ok']) {
            const finalResponseObject = this.sessionsUtilitySrvc.formatObject(sessionsData);
            return { ok: true, data: finalResponseObject };
        }
        else {
            return { ok: false, error: sessionsData['error'] };
        }
    }
};
SessionsService = __decorate([
    common_1.Injectable(),
    __metadata("design:paramtypes", [sessions_utility_service_1.SessionsUtilityService,
        user_utility_service_1.UserUtilityService,
        shared_service_1.SharedService])
], SessionsService);
exports.SessionsService = SessionsService;
//# sourceMappingURL=sessions.service.js.map