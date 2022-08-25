const fetch = require("node-fetch");
const exec = require('@actions/exec');

const { TAG, ACTOR, OAUTH_TOKEN, ORG_ID, ISSUE_ID } = process.env;

const getSummary = () => {
    const currentTag = TAG.replace('rc-', '');
    const dateNow = new Date().toLocaleDateString();
    return `Релиз №${currentTag} от ${dateNow}`;
}

const getPrevTag = async () => {
    console.log('Получаем предыдущий тег...');
    let arr = TAG.split('.');
    let curPatchVersion = arr[arr.length - 1];
    if (curPatchVersion > 1) {
        var prevTag = `rc-0.0.${curPatchVersion - 1}`
    } else {
        prevTag = null;
    }
    if (prevTag) {
        console.log('Сформирован предыдущий тег: ', prevTag);
        return prevTag;
    } else {
        console.log('Текущий тег является первым');
        return null;
    }
}

const getCommits = async (prevTag) => {
    console.log('Получаем список коммитов...');

    let myOutput = '';
    let myError = '';
        
    const options = {};
    options.listeners = {
        stdout: (data) => {
            myOutput += data.toString();
        },
        stderr: (data) => {
            myError += data.toString();
        }
    };

    let tagsOption = prevTag ? `${prevTag}...${TAG}` : TAG;
    console.log('Диапазон тегов для получения списка коммитов:', tagsOption);
    await exec.exec('git log', ['--pretty=format:"%H %an %s"', tagsOption], options);

    let isCommitsNotFound = myError.startsWith("fatal:");
    if (isCommitsNotFound) {
        console.log('Коммиты не найдены.');
        return null;
    } else {
        let commits = myOutput.replace(/"/g, '');
        console.log('Cписок коммитов получен.');
        return commits;
    }
}

const getDescription = async () => {
    const taskResponsibleInfo = `ответственный за релиз ${ACTOR}\n`;

    let prevTag = await getPrevTag();
    let commits = await getCommits(prevTag);

    const description = ''.concat(
        taskResponsibleInfo,
        '\n',
        'коммиты, попавшие в релиз:\n',
        commits,
    )
    return description;
}

const update_ticket = async () => {
    const summary = getSummary();
    const description = await getDescription();

    const headers = {
        Authorization: `OAuth ${OAUTH_TOKEN}`,
        "X-Org-ID": ORG_ID,
        "Content-Type": "application/json"
    };

    const data = { summary, description };
    const url = `https://api.tracker.yandex.net/v2/issues/${ISSUE_ID}`;
    
    console.log('Сформированные данные для запроса', data);

    const responce = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(data),
    });

    if (!responce.ok) {
        throw Error(`Ошибка при обновлении тикета: ${responce.statusText}`);
    } else {
        console.log('Обновление тикета успешно завершено.');
    }
}

update_ticket().then(r => console.log('Задача завершена.'));