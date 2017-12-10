const request = require('request-promise-native');
const crypto = require('crypto');
const nJ = require('normalize-json');
const promisify = require('util').promisify;
const config = require('./config');
const dao = require('./dao.mongo');

const roomOptionsSchema = nJ({
    'title': [ String, config.get('maxTitleLength') ],
    'desc': [ {$optional:String}, config.get('maxDescLength') ]
});
const addCharaSchema = nJ({
    'name': [ String, config.get('maxCharaNameLength') ],
    'color': /^#[0-9a-f]{6}$/g
});
const addMessageSchema = nJ({
    'content': [ String, config.get('maxMessageContentLength') ],
    'type': [ 'narrator', 'chara', 'ooc' ],
    'charaId': (msg)=> msg.type === 'chara' ? [ Number.isInteger, 0, Infinity ] : undefined,
    'challenge': [ String, 128 ]
});
const editMessageSchema = nJ({
    'id': [ Number.isInteger, 0, Infinity ],
    'content': [ String, config.get('maxMessageContentLength') ],
    'secret': [ String, 64 ]
});

async function generateRpCode() {
    let length = config.get('rpCodeLength');
    let characters = config.get('rpCodeChars');

    let numCryptoBytes = length * 2; // ample bytes just in case
    while (true) {
        let buffer = await promisify(crypto.randomBytes)(numCryptoBytes);

        let token = buffer.toString('base64');
        let rpCode = token.match(new RegExp(characters.split('').join('|'), 'g')).join('').substr(0, length);
        
        if (rpCode.length !== length) continue;

        let rp = await dao.getRoomByCode(rpCode);
        if (!rp) return rpCode;
    }
}

module.exports.generateChallenge = function(callback) {
    crypto.randomBytes(32, (err, buf) => {
        if (err) return callback({ code: 'INTERNAL_ERROR', details: err });

        let secret = buf.toString('hex');
        let hash = crypto.createHash('sha512')
            .update(secret)
            .digest('hex');

        callback(null, {secret, hash});
    });
};

function isCorrectSecret(guess, hash) {
    let guessHash = crypto.createHash('sha512')
        .update(guess)
        .digest('hex');

    return guessHash === hash;
}

module.exports.createRp = function(input, callback) {
    let roomOptions;
    try {
        roomOptions = roomOptionsSchema(input);
    }
    catch (error) {
        return callback({code: 'BAD_RP', details: error.message});
    }

    generateRpCode().then(rpCode => {
        dao.addRoom(rpCode, roomOptions).then(() => {
            callback(null, { rpCode });
        });
    });
};

module.exports.getRp = function(rpCode, callback) {
    if (typeof rpCode !== 'string') return callback({code: 'BAD_RPCODE'});

    dao.getRoomByCode(rpCode).then(data => {
        if (!data) return callback({code: 'RP_NOT_FOUND'});
        callback(null, data);
    });
};

async function pushToMsgs(rpid, msg, ipid) {
    msg.timestamp = Date.now() / 1000;
    msg.ipid = ipid;

    await dao.addMessage(rpid, msg);
    return { msg };
}

module.exports.addMessage = async function(rpid, input, ipid) {
    let msg;
    try {
        msg = addMessageSchema(input);
    }
    catch (error) {
        throw {code: 'BAD_MSG', details: error.message};
    }
    
    // store & broadcast
    if (msg.type === 'chara') {
        // charas must be in the chara list
        let exists = await dao.charaExists(rpid, msg.charaId);
        if (!exists) throw {code: 'CHARA_NOT_FOUND', details: `no character with id ${msg.charaId}`};
    }

    return await pushToMsgs(rpid, msg, ipid);
};

module.exports.addImage = async function(rpid, url, ipid) {
    if (typeof url !== 'string') throw {code: 'BAD_URL'};

    // validate image
    let res;
    try {
        res = await request.head(url);
    }
    catch (err) {
        throw { code: 'URL_FAILED', details: err.message };
    }
    if (!res['content-type']) throw { code: 'UNKNOWN_CONTENT' };
    if (!res['content-type'].startsWith('image/')) throw {code: 'BAD_CONTENT'};

    // store & broadcast
    let msg = {
        type: 'image',
        url: url
    };
    return await pushToMsgs(rpid, msg, ipid);
};

module.exports.addChara = async function(rpid, inputChara, ipid) {
    let chara;
    try {
        chara = addCharaSchema(inputChara);
    }
    catch (error) {
        throw {code: 'BAD_CHARA', details: error.message};
    }

    await dao.addChara(rpid, chara);
    return { chara };
};

module.exports.editMessage = async function(rpid, input, ipid) {
    let editInfo;
    try {
        editInfo = editMessageSchema(input);
    }
    catch (error) {
        throw {code: 'BAD_EDIT', details: error.message};
    }

    // check if the message is there
    let msg = await dao.getMessage(rpid, editInfo.id);
    if (!msg) throw { code: 'BAD_MSG_ID' };

    if (!isCorrectSecret(editInfo.secret, msg.challenge)) throw { code: 'BAD_SECRET'};

    msg.content = editInfo.content;
    msg.edited = (Date.now() / 1000);
    await dao.editMessage(rpid, editInfo.id, msg);
    return { msg };
};